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
- единая API-документация.

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

- сбор бизнес-событий;
- агрегация метрик;
- подготовка данных для дашбордов.

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

- **`Outbox pattern`** — реализован в `order-service`, `inventory-service`, `payment-service` (см. `docs/outbox-pattern.md`);
- **`Saga pattern`** — реализован для flow заказа;
- **`Idempotency`** — `processed_events` в consumer-сервисах;
- `Dead Letter Queue` — в планах;
- `Retry with exponential backoff` — outbox relay с лимитом retry;
- health/readiness/liveness endpoints;
- structured logging с correlation id / trace id.

## Предлагаемая структура репозитория

```text
/
  docs/
    project-blueprint.md
    outbox-pattern.md
  infra/
    docker/
    compose/
    monitoring/
    kafka/
  services/
    api-gateway/
    auth-service/
    catalog-service/
    order-service/
    inventory-service/
    payment-service/
    notification-service/
    analytics-service/
  packages/
    contracts/
    shared-observability/
    shared-testkit/
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
- соблюдать правила истории из `docs/git-workflow.md`;
- затем создавать сервисы и инфраструктуру маленькими инкрементами;
- не добавлять новый сервис без четкой ответственности;
- предпочитать простую реализацию, если production-паттерн пока не нужен на текущем этапе;
- спорные решения фиксировать явно в `docs/`.

## Ближайший следующий шаг

Полный core saga, outbox, Redis rate limit и **OpenTelemetry tracing** (Jaeger) реализованы. Следующий шаг:

- Prometheus + Grafana метрики;
- DLQ и компенсации saga.
