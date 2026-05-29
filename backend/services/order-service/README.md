# order-service

**Stack:** NestJS + Prisma + PostgreSQL + Kafka

Сервис заказов OrderFlow: API для клиентов, **transactional outbox** для `order.created`, **замыкание saga** через Kafka consumers.

**Порт:** `3002`
**БД:** `orderflow_order`

## Outbox

Создание заказа и запись в `outbox_messages` — в одной Prisma-транзакции. Фоновый `OutboxRelayService` публикует в Kafka (`FOR UPDATE SKIP LOCKED`, retry, статус `FAILED`).

Env: `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_RETRIES`.

Подробнее: `backend/docs/outbox-pattern.md`.

## Tracing

`OTEL_ENABLED=true` — HTTP + Kafka propagation (`traceparent` в headers). См. `backend/docs/observability.md`.

## API

| Метод | Путь                 | Auth | Описание           |
| ----- | -------------------- | ---- | ------------------ |
| POST  | `/api/v1/orders`     | JWT  | создать заказ      |
| GET   | `/api/v1/orders`     | JWT  | список заказов     |
| GET   | `/api/v1/orders/:id` | JWT  | детали заказа      |
| GET   | `/health`            | —    | healthcheck        |

## Статусы заказа (state machine)

| Статус            | Когда                                      |
| ----------------- | ------------------------------------------ |
| `PENDING`         | заказ создан                               |
| `PAYMENT_PENDING` | `inventory.reserved`                     |
| `CONFIRMED`       | `payment.succeeded`                        |
| `CANCELLED`       | `inventory.rejected`                       |
| `FAILED`          | `payment.failed`                           |

## Kafka

**Producer:** `order.created` (через outbox relay, не напрямую)

**Consumer (saga):**

- `inventory.reserved`
- `inventory.rejected`
- `payment.succeeded`
- `payment.failed`

Idempotency: таблица `processed_events` по `eventId`.

## Запуск

```bash
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

## Проверка финального статуса

После полного flow:

```bash
curl http://localhost:3000/api/v1/orders/<orderId> \
  -H "Authorization: Bearer <accessToken>"
```

Ожидаемый статус: `CONFIRMED`.
