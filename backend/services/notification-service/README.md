# notification-service

**Stack:** Go + PostgreSQL + **RabbitMQ**

Сервис уведомлений OrderFlow. Это наш **RabbitMQ-сервис** для учебного mixed-broker стека:

- **Kafka** — domain events (`order`, `inventory`, `payment`)
- **RabbitMQ** — task queue для доставки уведомлений

**Порт:** `3005`  
**БД:** `orderflow_notification`

## RabbitMQ topology

| Компонент | Значение |
| --------- | -------- |
| Exchange | `orderflow.notifications` (topic) |
| Queue | `notification-service.queue` |
| Binding | `notification.#` |

## Сообщения

Producer: `payment-service`  
Routing keys:

- `notification.payment.succeeded`
- `notification.payment.failed`

## Запуск

```bash
cp .env.example .env
go run ./cmd/server
```

Нужны Postgres, RabbitMQ и работающий `payment-service`.

## Management UI

http://localhost:15672 (`orderflow` / `orderflow`) — смотри очередь `notification-service.queue`.

## Поведение

- idempotency по `messageId`;
- история доставок в Postgres;
- сейчас email **симулируется** через structured logs (без реального SMTP).
