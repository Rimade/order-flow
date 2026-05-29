# OrderFlow Client

Фронтенд monorepo: **shell** (host) + микрофронтенды **mfe-auth**, **mfe-orders** + UI kit `@orderflow/ui`.

## Структура

```text
client/
  apps/
    shell/           # :4000 — роутер, layout, Module Federation host
    mfe-auth/        # :4101 — login, register
    mfe-orders/      # :4102 — список и деталь заказа
  packages/
    ui/              # Button, Input, Card, OrderStatusBadge, …
    api-client/      # fetch → api-gateway
    auth/            # JWT в sessionStorage
    config/          # VITE_API_URL
```

## Быстрый старт

1. Подними backend (см. [backend/docs/local-dev-routine.md](../backend/docs/local-dev-routine.md)): Docker + auth + gateway + order + inventory + payment.

2. Скопируй env и установи зависимости:

```powershell
cd client
copy .env.example .env
pnpm install
pnpm dev
```

1. Открой **<http://localhost:4000>** — регистрация → заказ (sku-1) → деталь с polling до `CONFIRMED`.

`pnpm dev` через Turborepo поднимает **shell**, **mfe-auth** и **mfe-orders** параллельно.

## API

```env
VITE_API_URL=http://localhost:3000
```

Все запросы только в gateway (`/api/v1/...`).

## Документация

- [docs/microfrontends.md](./docs/microfrontends.md)
- [docs/ui-kit.md](./docs/ui-kit.md)

## Сборка

```powershell
pnpm build
```
