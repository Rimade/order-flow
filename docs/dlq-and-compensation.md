# DLQ и компенсация saga

## Outbox DLQ

Когда relay не может опубликовать событие после `OUTBOX_MAX_RETRIES` попыток:

1. строка в `outbox_messages` → `FAILED`;
2. публикация в Kafka `dlq.outbox` с типом `outbox.dead_letter`.

Проверка в Kafka UI: топик `dlq.outbox`, фильтр по `service` в payload.

## Компенсация при failed payment

```text
payment.failed
    ├─► order-service      → order.status = FAILED
    └─► inventory-service  → release reservations (ACTIVE → RELEASED)
```

Inventory использует отдельный consumer group, чтобы не мешать `order.created`.

## Локальная проверка компенсации

1. `PAYMENT_SIMULATE_SUCCESS=false` в payment-service.
2. Создай заказ с валидным SKU.
3. Убедись: заказ `FAILED`, в inventory `reservations.status = RELEASED`, остатки восстановлены.
