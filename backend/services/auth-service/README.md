# auth-service

**Stack:** NestJS + Prisma + PostgreSQL

Сервис аутентификации OrderFlow: регистрация, логин, JWT access token, refresh token, профиль текущего пользователя.

**Порт по умолчанию:** `3001`

## API

| Метод | Путь                    | Описание              |
| ----- | ----------------------- | --------------------- |
| POST  | `/api/v1/auth/register` | регистрация           |
| POST  | `/api/v1/auth/login`    | логин                 |
| POST  | `/api/v1/auth/refresh`  | обновление токенов    |
| GET   | `/api/v1/auth/me`       | профиль (Bearer JWT)  |
| GET   | `/health`               | healthcheck + БД      |

## Запуск

1. Поднять инфраструктуру из `backend/infra/compose` (нужны Postgres и БД `orderflow_auth`).
2. Скопировать env:

```bash
cp .env.example .env
```

3. Применить миграции и сгенерировать Prisma client:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

4. Запустить сервис:

```bash
npm run start:dev
```

## Пример запроса

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

## База данных

Сервис владеет отдельной БД `orderflow_auth` на общем Postgres-инстансе для локальной разработки.
