# OrderFlow Blueprint

## Зачем этот проект

Этот репозиторий - учебный production-like backend-полигон. Цель проекта:

- научиться проектировать и разрабатывать микросервисы;
- на практике использовать `Kafka`, `Redis`, `PostgreSQL`, `Docker`, observability и надежные integration patterns;
- поработать со смешанным стеком `NestJS` + `Go`, как это часто бывает в компаниях;
- собрать не "демо CRUD", а систему, про которую можно уверенно рассказывать на собеседовании и развивать по этапам.

Этот документ - главный source of truth по архитектуре и направлению развития проекта.

## Домен проекта

Проект: **OrderFlow**

Домен: backend-система для оформления и обработки заказов в интернет-магазине.

Ключевой пользовательский сценарий:

1. пользователь логинится;
2. смотрит каталог;
3. создает заказ;
4. система резервирует остатки;
5. система обрабатывает оплату;
6. заказ получает финальный статус;
7. пользователь получает уведомление;
8. события попадают в аналитику.

## Архитектурные принципы

- каждый сервис владеет своими данными;
- синхронные запросы использовать только там, где нужен мгновенный ответ;
- асинхронное взаимодействие строить через `Kafka`;
- `Redis` использовать осознанно: кэш, idempotency, rate limit, short-lived state;
- избегать общей базы данных на все сервисы;
- закладывать observability с ранних этапов, а не "потом";
- каждую важную интеграцию проектировать с учетом retry, timeout, backoff и failure scenarios;
- проект развивать по инкрементам: сначала core flow, потом надежность, затем платформенные улучшения.

## Стек

### Языки и фреймворки

- `NestJS` - API-oriented и business-oriented сервисы;
- `Go` - высоконагруженные воркеры, event consumers, integration-heavy сервисы.

### Инфраструктура

- `PostgreSQL` - основное хранилище;
- `Redis` - кэш, ephemeral state, idempotency, locks;
- `Kafka` - event bus и domain events между core-сервисами;
- `RabbitMQ` - task queue для уведомлений (`notification-service`);
- `Docker Compose` - локальная разработка;
- `OpenTelemetry` - трассировка и метрики;
- `Jaeger` - distributed tracing;
- `Prometheus` + `Grafana` - метрики и дашборды;
- `Kafka UI` - просмотр топиков и сообщений;
- `RabbitMQ Management` - просмотр очередей и bindings.

### Почему Kafka + RabbitMQ

- `Kafka` хорош для event streaming и saga между `order` / `inventory` / `payment`.
- `RabbitMQ` хорош для work-queue задач с быстрым ack/retry (email, webhooks, push).
- `notification-service` сознательно на RabbitMQ, чтобы в проекте был mixed-broker опыт как в реальных компаниях.

## Состав сервисов

### NestJS

#### `api-gateway`

Ответственность:

- входная точка для клиентов;
- auth guards;
- rate limiting;
- маршрутизация к backend-сервисам;
- единая API-документация (OpenAPI + GraphQL BFF read-model);
- GraphQL `/graphql` — агрегация read-запросов (не замена REST/команд).

#### `auth-service`

Ответственность:

- регистрация;
- логин;
- refresh tokens;
- профили пользователей;
- базовые роли и права.

#### `catalog-service`

Ответственность:

- каталог товаров;
- категории;
- цены;
- публичный read API;
- кэширование популярных запросов через `Redis`.

#### `order-service`

Ответственность:

- создание заказа;
- управление жизненным циклом заказа;
- публикация доменных событий;
- координация бизнес-процесса заказа.

### Go

#### `inventory-service`

Ответственность:

- резервирование остатков;
- подтверждение или откат резервов;
- защита от гонок и overselling;
- обработка событий заказа.

#### `payment-service`

Ответственность:

- прием команды на оплату;
- idempotent-обработка платежей;
- retries;
- публикация `payment.succeeded` / `payment.failed`.

#### `notification-service`

Ответственность:

- отправка email или webhook-уведомлений;
- consumption событий заказа и оплаты;
- безопасные повторы при временных сбоях.

#### `analytics-service`

Ответственность:

- consumption saga Kafka-событий (`order.created`, inventory/payment outcomes);
- агрегация orders-by-status / day и funnel (cancel rate);
- HTTP read API + Prometheus business counters (`:3007`).

См. [analytics.md](./analytics.md).

## Границы данных

- `auth-service` владеет пользователями и refresh tokens;
- `catalog-service` владеет товарами, категориями и ценами;
- `order-service` владеет заказами и их статусами;
- `inventory-service` владеет доступными остатками и резервами;
- `payment-service` владеет платежными транзакциями;
- `notification-service` хранит историю попыток доставки сообщений;
- `analytics-service` владеет агрегированными событиями и метриками.

Запрещено читать чужую таблицу напрямую из другого сервиса.

## Kafka Topics

Базовый набор:

- `order.created`
- `order.cancelled`
- `inventory.reserved`
- `inventory.rejected`
- `payment.requested`
- `payment.succeeded`
- `payment.failed`
- `notification.requested`
- `user.registered`

Позже добавить:

- `order.completed`
- `order.failed`
- `catalog.price-updated`
- `dlq.*` топики для проблемных сообщений.

## Redis Use Cases

- кэширование каталога и карточек товара;
- ~~rate limiting на gateway~~ (Redis + `@nestjs/throttler` в `api-gateway`);
- хранение idempotency keys для платежей и внешних запросов;
- distributed locks там, где нужна защита от гонок;
- short-lived state для саг и фоновых задач.

`Redis` не должен заменять основную БД там, где нужны надежные business records.

## Надежные паттерны

Проект постепенно внедряет production-практики:

- **`Outbox pattern`** — реализован в `order-service`, `inventory-service`, `payment-service` (см. [outbox-pattern.md](./outbox-pattern.md));
- **`Saga pattern`** — реализован для flow заказа;
- **`Idempotency`** — `processed_events` в consumer-сервисах;
- `Dead Letter Queue` — в планах;
- `Retry with exponential backoff` — outbox relay с лимитом retry;
- health/readiness/liveness endpoints;
- structured logging с correlation id / trace id.

## Клиент (микрофронтенды)

Планируется фронтенд-monorepo: **shell** + remote-приложения по доменам, общий UI kit и вызовы API **только через `api-gateway`**.

| Документ | Содержание |
|----------|------------|
| [client/docs/microfrontends.md](../../client/docs/microfrontends.md) | архитектура MFE, Module Federation, этапы |
| [client/docs/ui-kit.md](../../client/docs/ui-kit.md) | `@orderflow/ui` — собственная дизайн-система (подход как shadcn, код в репозитории) |

Статус: **фаза 1 готова** — shell + `mfe-auth` + `mfe-orders`, Module Federation, UI kit, сценарий login → заказ → `CONFIRMED` в браузере ([client/README.md](../../client/README.md)).

## Структура репозитория

```text
/
  docs/                    # git-workflow (общее для репозитория)
  backend/
    docs/                  # blueprint, local-dev, outbox, observability
    scripts/               # dev-up.ps1 → infra/compose
    services/              # api-gateway, auth, order, inventory, ...
    infra/compose/         # Postgres, Redis, Kafka, RabbitMQ
    packages/              # contracts, shared-observability, shared-testkit
  client/
    docs/                  # microfrontends, ui-kit
    apps/                  # shell, mfe-auth, mfe-orders, mfe-catalog (позже)
    packages/              # ui, api-client, auth, config
```

## Этапы разработки

### Этап 1. Foundation

- создать структуру монорепозитория;
- поднять `PostgreSQL`, `Redis`, `Kafka`, `Kafka UI`;
- добавить базовые env-конфиги;
- договориться о формате логов, healthchecks и naming.

### Этап 2. Core services

- реализовать `api-gateway`;
- реализовать `auth-service`;
- реализовать `order-service`;
- реализовать `inventory-service`;
- реализовать `payment-service`.

### Этап 3. Event flow

- завести базовые Kafka topics;
- реализовать полный flow `create order -> reserve inventory -> request payment -> finalize order`;
- добавить retry и базовую обработку ошибок.

### Этап 4. Observability

- подключить `OpenTelemetry`;
- поднять `Jaeger`, `Prometheus`, `Grafana`;
- добавить бизнес- и технические метрики.

### Этап 5. Production patterns

- ~~outbox~~ (polling relay в order / inventory / payment);
- idempotency keys;
- DLQ;
- компенсационные сценарии в saga;
- нагрузочные и интеграционные тесты.

### Этап 6. Frontend (микрофронтенды)

- monorepo `client/` + `packages/ui` ([microfrontends.md](../../client/docs/microfrontends.md));
- shell + `mfe-auth` + `mfe-orders`, Module Federation;
- UI kit `@orderflow/ui` ([ui-kit.md](../../client/docs/ui-kit.md));
- сценарий в браузере: login → заказ → `CONFIRMED`;
- позже: `mfe-catalog`, Playwright E2E, деплой статики remotes.

## Definition of Done для каждой новой фичи

Фича считается завершенной, если:

- описана в документации;
- понятны владелец данных и границы сервиса;
- есть happy path и failure path;
- есть логи, healthcheck и конфигурация;
- событие или API названы последовательно и предсказуемо;
- локально запускается через общий dev environment.

## Как работать дальше в этом репозитории

- сначала обновлять этот blueprint при крупных архитектурных решениях;
- соблюдать правила истории из [docs/git-workflow.md](../../docs/git-workflow.md);
- затем создавать сервисы и инфраструктуру маленькими инкрементами;
- не добавлять новый сервис без четкой ответственности;
- предпочитать простую реализацию, если production-паттерн пока не нужен на текущем этапе;
- спорные решения фиксировать в `backend/docs/` или `client/docs/` (ADR при необходимости).

## Ближайший следующий шаг

Backend: core saga, outbox (+ DLQ), Redis rate limit, tracing, metrics и компенсация inventory реализованы.

### План (приоритет)

1. **GraphQL BFF на gateway** — read-only `order(id)` + catalog enrichment ✅; дальше опционально `me.orders`. См. [graphql-bff.md](./graphql-bff.md).
2. **`analytics-service` (Go)** ✅ — Kafka → агрегаты + HTTP `:3007`; [analytics.md](./analytics.md).
3. **Бизнес-метрики** ✅ — order/inventory/payment counters + Grafana panels; [metrics.md](./metrics.md).
4. **CI глубже** — `go build` + contract smoke; полный Playwright saga — локально.
5. **Failure/idempotency тесты** — payment-fail → compensation; duplicate Idempotency-Key.
6. **Catalog write + cache invalidation** — учебный admin/seed path.

Сознательно **не** берём: ELK/Loki, Alertmanager, service mesh, GraphQL внутри auth/order/payment.

Frontend: фазы 1–2 + OpenAPI codegen уже закрыты (см. выше).

Backend (сделано):

- ~~replay tooling для `dlq.outbox`~~ — `backend/scripts/outbox-replay.ps1` (reset FAILED → PENDING);
- ~~Idempotency-Key~~ — Redis в order-service, см. [idempotency.md](./idempotency.md);
- ~~Swagger UI~~ — gateway `/docs` из contracts YAML, [openapi.md](./openapi.md);
- ~~SSE статуса заказа~~ — [order-status-sse.md](./order-status-sse.md);
- ~~Outbox ops UI~~ — [outbox-ops-ui.md](./outbox-ops-ui.md) + CLI replay;
- ~~Access/refresh в клиенте~~ — [auth-refresh.md](./auth-refresh.md) (+ logout revoke);
- ~~Catalog Redis cache~~ — [catalog-cache.md](./catalog-cache.md) (default `CACHE_STORE=redis`);
- ~~Metrics + OTEL на всех живых сервисах~~ — scrape 3000–3007; [observability.md](./observability.md), [metrics.md](./metrics.md);
- ~~analytics-service~~ — [analytics.md](./analytics.md);
- CI: `.github/workflows/backend-ci.yml` (Nest build + compose postgres/redis); полный saga e2e — локально;
- Observability runbook: [observability.md](./observability.md).
