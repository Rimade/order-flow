# OrderFlow Client

Фронтенд monorepo: **shell** (host) + микрофронтенды **mfe-auth**, **mfe-orders**, **mfe-catalog** + UI kit `@orderflow/ui`.

## Структура

```text
client/
  apps/
    shell/           # :4000 — роутер, layout, Module Federation host
    mfe-auth/        # :4101 — login, register
    mfe-orders/      # :4102 — список и деталь заказа
    mfe-catalog/     # :4103 — каталог и оформление
  packages/
    ui/              # Button, Input, Card, Dialog, Select, …
    api-client/      # fetch → api-gateway (типы из OpenAPI)
    auth/            # JWT в sessionStorage
    config/          # VITE_API_URL
```

## Быстрый старт

1. Подними backend (см. [backend/docs/local-dev-routine.md](../backend/docs/local-dev-routine.md)): Docker + auth + gateway + order + **catalog** + inventory + payment.

2. Скопируй env и установи зависимости:

```powershell
cd client
copy .env.example .env
pnpm install
pnpm dev
```

1. Открой **<http://localhost:4000>** — регистрация → заказ (sku-1) → деталь с polling до `CONFIRMED`.

`pnpm dev` поднимает **shell** (:4000, vite dev) и remotes (:4101–4103).

Remotes работают через **`vite build --watch` + `vite preview`** — так требует `@originjs/vite-plugin-federation` (в обычном `vite dev` нет настоящего `remoteEntry.js`). После старта подожди **20–40 с**, пока remotes соберутся, затем открывай :4000.

Проверка: <http://localhost:4101/assets/remoteEntry.js> — должен быть **JavaScript**, не HTML.

Флаг `VITE_CATALOG_ENABLED=false` скрывает каталог в меню и маршрутах.

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
pnpm codegen   # типы из backend/packages/contracts/openapi/
pnpm build
```

## E2E (Playwright)

**Сначала backend** (gateway :3000 + saga-сервисы). Затем:

```powershell
cd client
pnpm install
pnpm exec playwright install chromium
pnpm e2e
```

Playwright сам поднимет `pnpm dev` (shell + remotes), если они ещё не запущены.
UI-режим: `pnpm e2e:ui`. Отчёт: `pnpm e2e:report`.

## Production-like static (nginx + Docker)

Собранный shell и remotes на **<http://localhost:8080>** (один origin для Module Federation):

```powershell
# backend на :3000 должен быть запущен
cd client
pnpm docker:up
```

Подробнее: [infra/README.md](./infra/README.md).
