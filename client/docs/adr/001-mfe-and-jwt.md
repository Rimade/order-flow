# ADR 001: Module Federation и JWT в SPA

**Статус:** принято (фаза 1)
**Дата:** 2026-05

## Контекст

Нужен клиент с независимыми доменными приложениями (auth, orders) и единой точкой входа в API (gateway).

## Решения

### Module Federation (`@originjs/vite-plugin-federation`)

- **shell** (:4000) — host, роутер, layout;
- **mfe-auth** (:4101), **mfe-orders** (:4102) — remotes с `remoteEntry.js`;
- shared: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`.

**Альтернатива:** iframe — проще изоляция, хуже UX и общий router. Не выбрали.

### JWT в `sessionStorage`

- Ключи: `orderflow.accessToken`, `orderflow.refreshToken`, `orderflow.user`;
- Заголовок: `Authorization: Bearer …` через `@orderflow/auth`.

**Альтернатива:** httpOnly cookie — безопаснее от XSS, требует BFF или настройку cookie на gateway. Отложено (фаза 2+).

### Polling статуса заказа

- `refetchInterval: 2000` на детальной странице, пока статус не `CONFIRMED` | `CANCELLED` | `FAILED`.

**Альтернатива:** WebSocket/SSE — меньше запросов, сложнее инфра. Отложено.

## Последствия

- Для `pnpm dev` должны работать все три Vite-процесса.
- Gateway должен отдавать CORS для `localhost:4000–4102`.
- Production: shell должен знать URL `remoteEntry.js` remotes через env (фаза 3).
