# OrderFlow

Учебный production-like проект: e-commerce backend (микросервисы) + клиент (микрофронтенды).

## Структура репозитория

```text
/
  backend/          # NestJS + Go, Docker, Kafka, Postgres
    docs/           # архитектура, local-dev, observability
    scripts/        # dev-up.ps1, dev-down.ps1, dev-ps.ps1
    services/
    infra/compose/
    packages/
  client/           # React monorepo: shell + MFE + @orderflow/ui
    docs/           # microfrontends, ui-kit
    apps/
    packages/
  docs/             # только общее для репозитория (git-workflow)
```

## Документация

| Раздел | Документ | Описание |
|--------|----------|----------|
| Backend | [backend/docs/project-blueprint.md](backend/docs/project-blueprint.md) | архитектура микросервисов |
| Backend | [backend/docs/local-dev-routine.md](backend/docs/local-dev-routine.md) | запуск/остановка стека |
| Client | [client/docs/microfrontends.md](client/docs/microfrontends.md) | план микрофронтендов |
| Client | [client/docs/ui-kit.md](client/docs/ui-kit.md) | UI kit `@orderflow/ui` |
| Repo | [docs/git-workflow.md](docs/git-workflow.md) | ветки и коммиты |
| — | [backend/README.md](backend/README.md) | entry backend |
| — | [client/README.md](client/README.md) | entry client |

## Быстрый старт (backend)

```powershell
# из корня репозитория
.\backend\scripts\dev-up.ps1

cd backend\services\auth-service
copy .env.example .env
npm install
npm run prisma:migrate:dev
npm run start:dev
```

```powershell
cd backend\services\api-gateway
copy .env.example .env
npm install
npm run start:dev
```

Полный сценарий (order, inventory, payment) — [backend/docs/local-dev-routine.md](backend/docs/local-dev-routine.md).

Gateway: <http://localhost:3000>
Kafka UI: <http://localhost:8080>

## Клиент

Фаза 1: shell + mfe-auth + mfe-orders — см. [client/README.md](client/README.md).

```powershell
cd client
copy .env.example .env
pnpm install
pnpm dev
```

Открыть: <http://localhost:4000>

## Event flow

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

Клиенты ходят **только в gateway** (`http://localhost:3000`).
