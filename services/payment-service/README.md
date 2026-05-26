# payment-service

**Stack:** Go + PostgreSQL + Kafka

Сервис оплаты OrderFlow: слушает `inventory.reserved`, создаёт платёж, публикует `payment.succeeded` или `payment.failed`.

**Порт:** `3004`  
**БД:** `orderflow_payment`

## Kafka

| Направление | Topic               |
| ----------- | ------------------- |
| consume     | `inventory.reserved`|
| produce     | `payment.succeeded` |
| produce     | `payment.failed`    |

## Demo-режим

По умолчанию `PAYMENT_SIMULATE_SUCCESS=true` — платёж всегда успешен. Для проверки отказа установи `false`.

## Запуск

```bash
cp .env.example .env
go run ./cmd/server
```

Требуется Postgres, Kafka и работающая цепочка `order-service` → `inventory-service`.
