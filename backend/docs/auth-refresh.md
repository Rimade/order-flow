# Auth: access + refresh tokens

## Контракт

| Endpoint | Auth | Назначение |
|----------|------|------------|
| `POST /api/v1/auth/register` | нет | выдаёт access + refresh + user |
| `POST /api/v1/auth/login` | нет | то же |
| `POST /api/v1/auth/refresh` | нет (body: refreshToken) | ротация refresh, новый access |
| `POST /api/v1/auth/logout` | нет (body: refreshToken) | revoke refresh (идемпотентно) |
| `GET /api/v1/auth/me` | Bearer access | профиль |

TTL (по умолчанию в auth-service):

- access: `JWT_ACCESS_EXPIRES_IN=15m`
- refresh: `JWT_REFRESH_EXPIRES_IN=7d` (хранится hash в БД, rotation при refresh)

## Клиент

### Refresh on 401

`@orderflow/api-client` при **401** на запросе с `auth: true`:

1. один общий `POST /auth/refresh` (mutex);
2. при успехе — повтор исходного запроса;
3. при неудаче — `clearAuthSession()` и редирект на `/login`.

### Logout

Кнопка **Выйти** в shell: `POST /auth/logout` с текущим refresh → очистка `sessionStorage`.

Токены в `sessionStorage` (`@orderflow/auth`).

## Проверка

1. Залогинься → **Выйти** → тот же refresh через curl `/auth/refresh` должен дать **401**.
2. Access после logout ещё может жить до TTL (15m) — это нормально для stateless JWT; refresh уже нельзя использовать.

Swagger: http://localhost:3000/docs → `POST /auth/logout`, `POST /auth/refresh`.
