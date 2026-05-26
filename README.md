# OrderFlow

`OrderFlow` - учебный production-like backend-проект для практики микросервисной архитектуры на смешанном стеке `NestJS` + `Go`.

Цель репозитория - не просто собрать CRUD, а пошагово построить систему обработки заказов с актуальными инфраструктурными и platform-практиками: `Kafka`, `Redis`, `PostgreSQL`, `Docker Compose`, `OpenTelemetry`, `Prometheus`, `Grafana`, `Jaeger`.

## Структура репозитория

```text
/
  docs/           # архитектура и git workflow
  infra/          # docker compose, kafka, monitoring
  services/       # микросервисы (NestJS + Go)
  packages/       # общие контракты и shared libs
```

## Что внутри

- `docs/project-blueprint.md` - главный архитектурный документ проекта;
- `docs/git-workflow.md` - правила коммитов и ведения истории;
- `infra/compose/` - локальный стек PostgreSQL, Redis, Kafka, Kafka UI;
- `services/` - каталоги сервисов со skeleton README;
- `.cursor/rules/` - постоянный контекст и conventions для работы через Cursor.

## Домен

Проект моделирует backend интернет-магазина с event-driven обработкой заказов:

1. пользователь проходит аутентификацию;
2. просматривает каталог;
3. создает заказ;
4. система резервирует остатки;
5. система инициирует оплату;
6. заказ получает итоговый статус;
7. отправляются уведомления;
8. события уходят в аналитику.

## Планируемые сервисы

### NestJS

- `api-gateway`
- `auth-service`
- `catalog-service`
- `order-service`

### Go

- `inventory-service`
- `payment-service`
- `notification-service`
- `analytics-service`

## Технологии

- `NestJS`
- `Go`
- `Kafka`
- `Redis`
- `PostgreSQL`
- `Docker Compose`
- `OpenTelemetry`
- `Prometheus`
- `Grafana`
- `Jaeger`

## Как работать с проектом

Пока репозиторий находится на этапе foundation:

- архитектурные изменения сначала фиксируются в `docs/project-blueprint.md`;
- коммиты оформляются по `Conventional Commits`;
- изменения держим маленькими и логически цельными;
- новый сервис добавляем только с понятной зоной ответственности.

## Быстрый старт (gateway + auth)

```bash
# 1. Инфраструктура
cd infra/compose
cp .env.example .env
docker compose up -d

# 2. Auth (отдельный терминал)
cd ../../services/auth-service
cp .env.example .env
npm run prisma:migrate:dev
npm run start:dev

# 3. Gateway (отдельный терминал)
cd ../api-gateway
cp .env.example .env
# JWT_ACCESS_SECRET должен совпадать с auth-service
npm run start:dev

# 4. Order (отдельный терминал, нужен Kafka)
cd ../order-service
cp .env.example .env
npm run prisma:migrate:dev
npm run start:dev

# 5. Inventory (Go, отдельный терминал)
cd ../inventory-service
cp .env.example .env
go run ./cmd/server

# 6. Payment (Go, отдельный терминал)
cd ../payment-service
cp .env.example .env
go run ./cmd/server

# 7. Notification (Go + RabbitMQ)
cd ../notification-service
cp .env.example .env
go run ./cmd/server
```

## Event flow (полный saga)

```text
Client -> gateway -> order-service (PENDING)
              | order.created
              v
       inventory-service -> inventory.reserved | inventory.rejected
              | reserved
              v
        order-service (PAYMENT_PENDING)
              |
              v
        payment-service -> payment.succeeded | payment.failed
              | succeeded
              v
        order-service (CONFIRMED) + notification-service (RabbitMQ)
```

**Брокеры:** Kafka — domain/saga events, RabbitMQ — notification tasks.

Регистрация через gateway:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

## Локальный запуск инфраструктуры

```bash
cd infra/compose
cp .env.example .env
docker compose up -d
```

После старта:

- Kafka UI: <http://localhost:8080>
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kafka: `localhost:9092`

Подробнее: `infra/compose/README.md`.

## Сервисы

| Сервис         | Порт | Роль                                      |
| -------------- | ---- | ----------------------------------------- |
| `api-gateway`  | 3000 | вход для клиентов, JWT, rate limit, proxy |
| `auth-service` | 3001 | регистрация, логин, refresh, профиль      |
| `order-service`| 3002 | заказы, Kafka saga producer/consumer      |
| `inventory-service` | 3003 | остатки, consumer/producer Kafka   |
| `payment-service`   | 3004 | оплата, Kafka + RabbitMQ publish   |
| `notification-service` | 3005 | уведомления, **RabbitMQ** consumer |

Клиенты ходят **только в gateway** (`http://localhost:3000`). Внутренние сервисы не публикуются наружу на этапе локальной разработки.

## Ближайшие шаги

- OpenTelemetry tracing между сервисами;
- DLQ для failed outbox / consumer messages;
- компенсации saga.
