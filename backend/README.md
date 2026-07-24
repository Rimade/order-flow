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
- [docs/auth-refresh.md](./docs/auth-refresh.md)
- [docs/catalog-cache.md](./docs/catalog-cache.md)
- [docs/observability.md](./docs/observability.md) — runbook «заказ → Jaeger»
- [docs/analytics.md](./docs/analytics.md)
- [docs/graphql-bff.md](./docs/graphql-bff.md)
- [infra/compose/README.md](./infra/compose/README.md)

## CI

GitHub Actions: `.github/workflows/backend-ci.yml`

- Nest build (gateway, auth, order, catalog)
- Go test + build (inventory, payment, notification, analytics)
- OpenAPI contract markers + `openapi:check`
- Compose postgres/redis
- Smoke: auth + gateway health, register → login → me

Полный saga / Playwright — локально ([local-dev-routine.md](./docs/local-dev-routine.md)).
