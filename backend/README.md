# OrderFlow Backend

Микросервисы, инфраструктура и shared-пакеты.

## Структура

```text
backend/
  docs/              # blueprint, local-dev, outbox, observability
  scripts/           # dev-up.ps1 → infra/compose
  services/          # NestJS + Go микросервисы
  infra/compose/     # Docker: Postgres, Redis, Kafka, RabbitMQ
  packages/          # shared-observability, contracts, testkit
```

## Быстрый старт

Из корня репозитория:

```powershell
.\backend\scripts\dev-up.ps1
```

Или вручную:

```powershell
cd backend\infra\compose
copy .env.example .env
docker compose up -d
```

Сервисы — см. [docs/local-dev-routine.md](./docs/local-dev-routine.md) и [README.md](../README.md).

## Документация

- [docs/project-blueprint.md](./docs/project-blueprint.md)
- [docs/local-dev-routine.md](./docs/local-dev-routine.md)
- [docs/outbox-pattern.md](./docs/outbox-pattern.md)
- [docs/idempotency.md](./docs/idempotency.md)
- [docs/openapi.md](./docs/openapi.md) — Swagger UI `/docs` + codegen
- [docs/order-status-sse.md](./docs/order-status-sse.md)
- [docs/outbox-ops-ui.md](./docs/outbox-ops-ui.md)
- [docs/observability.md](./docs/observability.md) — runbook «заказ → Jaeger»
- [infra/compose/README.md](./infra/compose/README.md)
