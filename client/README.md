# OrderFlow Client

Фронтенд monorepo: shell + микрофронтенды + UI kit `@orderflow/ui`.

## Структура

```text
client/
  docs/              # microfrontends, ui-kit
  apps/
    shell/           # host: layout, router, Module Federation
    mfe-auth/        # login, register
    mfe-orders/      # список и создание заказов
  packages/
    ui/              # дизайн-система (см. docs/ui-kit.md)
    api-client/      # HTTP к api-gateway
    auth/            # JWT, hooks
    config/          # env
```

## API

Все запросы только в backend gateway:

```env
VITE_API_URL=http://localhost:3000
```

## Документация

- [docs/microfrontends.md](./docs/microfrontends.md)
- [docs/ui-kit.md](./docs/ui-kit.md)

## Статус

Скелет monorepo создан. Следующий шаг: Vite + Module Federation + экраны login/orders.

```powershell
# когда будет готово:
cd client
pnpm install
pnpm dev
```

Открыть: `http://localhost:4000` (shell).

## Backend

Перед запуском клиента подними backend — [backend/docs/local-dev-routine.md](../backend/docs/local-dev-routine.md).
