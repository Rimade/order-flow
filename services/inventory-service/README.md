# inventory-service

**Stack:** Go + PostgreSQL + Kafka

Сервис остатков OrderFlow: слушает `order.created`, резервирует товар, публикует `inventory.reserved` или `inventory.rejected` **через transactional outbox**.

**Порт:** `3003` (HTTP health)
**БД:** `orderflow_inventory`

## Outbox

Резерв / отказ и запись события — в одной SQL-транзакции. Goroutine `internal/outbox` relay публикует в Kafka.

Env: `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_RETRIES`.

Подробнее: `docs/outbox-pattern.md`.

## Production-практики

- отдельная БД и владение данными об остатках;
- consumer group `inventory-service`;
- idempotency по `eventId` (`processed_events`);
- транзакционный резерв с `SELECT ... FOR UPDATE`;
- structured JSON logs (`slog`);
- graceful shutdown.

## Kafka

| Направление | Topic                 |
| ----------- | --------------------- |
| consume     | `order.created`       |
| produce     | `inventory.reserved`  |
| produce     | `inventory.rejected`  |

## Seed-данные

Для локальной проверки заранее есть остатки:

- `sku-1` — 100 шт.
- `sku-2` — 50 шт.

## Запуск

```bash
cp .env.example .env
go run ./cmd/server
```

Требуется Postgres, Kafka и уже работающий `order-service`, который публикует `order.created`.

## Проверка flow

1. Создай заказ через gateway (`sku-1`, quantity <= 100).
2. В Kafka UI проверь `inventory.reserved`.
3. Для отказа попробуй quantity больше доступного остатка — будет `inventory.rejected`.
