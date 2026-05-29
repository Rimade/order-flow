# payment-service

**Stack:** Go + PostgreSQL + Kafka

Сервис оплаты OrderFlow: слушает `inventory.reserved`, создаёт платёж, публикует `payment.succeeded` / `payment.failed` и задачи уведомлений **через transactional outbox** (Kafka + RabbitMQ).

**Порт:** `3004`
**БД:** `orderflow_payment`

## Outbox

Платёж, idempotency mark и две outbox-записи (Kafka + RabbitMQ) — в одной транзакции. Relay dispatch по полю `destination`.

Env: `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_RETRIES`.

Подробнее: `backend/docs/outbox-pattern.md`.

## Kafka

| Направление | Topic               |
| ----------- | ------------------- |
| consume     | `inventory.reserved`|
| produce     | `payment.succeeded` |
| produce     | `payment.failed`    |
| publish (RMQ) | `notification.payment.*` → `notification-service` |

## Demo-режим

По умолчанию `PAYMENT_SIMULATE_SUCCESS=true` — платёж всегда успешен. Для проверки отказа установи `false`.

## Запуск

```bash
cp .env.example .env
go run ./cmd/server
```

Требуется Postgres, Kafka и работающая цепочка `order-service` → `inventory-service`.
