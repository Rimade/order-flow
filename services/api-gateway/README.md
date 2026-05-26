# api-gateway

**Stack:** NestJS

Единая точка входа для клиентов OrderFlow. Gateway не содержит бизнес-логики: валидирует JWT, ограничивает трафик, проксирует запросы в backend-сервисы и пробрасывает observability-заголовки.

**Порт по умолчанию:** `3000`

## Production-практики в этом сервисе

- JWT validation на edge (общий `JWT_ACCESS_SECRET` с `auth-service`; в проде позже можно перейти на JWKS/RS256);
- distributed rate limiting (`@nestjs/throttler` + Redis, `THROTTLE_STORAGE=redis`);
- OpenTelemetry → Jaeger (`OTEL_ENABLED=true`, см. `docs/observability.md`);
- in-memory fallback для тестов (`THROTTLE_STORAGE=memory`);
- `helmet` для security headers;
- `x-request-id` для correlation id;
- проброс `x-user-id` / `x-user-email` во внутренние сервисы после валидации JWT;
- healthcheck gateway + upstream `auth-service`;
- таймауты и обработка недоступности upstream.

## Маршрутизация

| Клиент (gateway)              | Upstream              |
| ----------------------------- | --------------------- |
| `POST /api/v1/auth/register`  | `auth-service`        |
| `POST /api/v1/auth/login`     | `auth-service`        |
| `POST /api/v1/auth/refresh`   | `auth-service`        |
| `GET /api/v1/auth/me`         | `auth-service` (JWT)  |
| `POST /api/v1/orders`         | `order-service` (JWT) |
| `GET /api/v1/orders`          | `order-service` (JWT) |
| `GET /api/v1/orders/:id`      | `order-service` (JWT) |
| `GET /health`                 | локальный health      |

Публичные auth-эндпоинты не требуют JWT. `GET /api/v1/auth/me` требует `Authorization: Bearer <accessToken>`.

## Запуск

1. Поднять `infra/compose` и запустить `auth-service`.
2. Скопировать env (секрет JWT должен совпадать с `auth-service`):

```bash
cp .env.example .env
```

1. Redis из `infra/compose` (для `THROTTLE_STORAGE=redis`).

2. Запуск:

```bash
npm run start:dev
```

## Rate limit

| Env | Описание |
| --- | -------- |
| `THROTTLE_TTL_MS` | окно в мс (по умолчанию 60000) |
| `THROTTLE_LIMIT` | запросов на IP за окно |
| `THROTTLE_STORAGE` | `redis` (distributed) или `memory` |
| `REDIS_URL` | обязателен при `redis`, например `redis://localhost:6379` |

`/health` не лимитируется. Ключ — IP клиента (учитывается `X-Forwarded-For` за reverse proxy).

## Пример через gateway

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

## Health

- Gateway: `GET http://localhost:3000/health`
- Upstream auth: проверяется через `AUTH_SERVICE_URL/health`
