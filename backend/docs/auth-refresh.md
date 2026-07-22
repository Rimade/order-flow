# Auth: access + refresh tokens

## Контракт

| Endpoint | Auth | Назначение |
|----------|------|------------|
| `POST /api/v1/auth/register` | нет | выдаёт access + refresh + user |
| `POST /api/v1/auth/login` | нет | то же |
| `POST /api/v1/auth/refresh` | нет (body: refreshToken) | ротация refresh, новый access |
| `GET /api/v1/auth/me` | Bearer access | профиль |

TTL (по умолчанию в auth-service):

- access: `JWT_ACCESS_EXPIRES_IN=15m`
- refresh: `JWT_REFRESH_EXPIRES_IN=7d` (хранится hash в БД, rotation при refresh)

## Клиент

`@orderflow/api-client` при **401** на запросе с `auth: true`:

1. один общий `POST /auth/refresh` (mutex — параллельные 401 не делают N refresh);
2. при успехе — повтор исходного запроса с новым access;
3. при неудаче — `clearAuthSession()` и редирект на `/login`.

Токены в `sessionStorage` (`@orderflow/auth`).

## Проверка

1. Залогинься в UI.
2. В DevTools → Application → Session Storage скопируй access и замени на мусор / дождись 15m.
3. Открой **Заказы** — клиент должен тихо обновить токены через refresh (или редирект, если refresh тоже протух).

Swagger: http://localhost:3000/docs → `POST /auth/refresh`.
