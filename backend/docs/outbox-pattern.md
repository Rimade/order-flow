# Transactional Outbox Pattern

## Зачем

Без outbox возможна потеря событий:

1. заказ сохранён в БД;
2. сервис упал до публикации в Kafka;
3. consumer никогда не получит событие.

Outbox решает это атомарной записью бизнес-данных и события в одной транзакции.

## Как работает в OrderFlow

```text
API / Consumer handler
        |
        v
  DB transaction
  - business row (order, payment, reservation)
  - outbox_messages (status=PENDING)
        |
        v
  Outbox Relay Worker (background)
  - SELECT ... FOR UPDATE SKIP LOCKED
  - publish to Kafka / RabbitMQ
  - mark PUBLISHED (or retry / FAILED)
```

## Где включено

| Сервис              | Broker   | События                          |
| ------------------- | -------- | -------------------------------- |
| `order-service`     | Kafka    | `order.created`                  |
| `inventory-service` | Kafka    | `inventory.reserved/rejected`    |
| `payment-service`   | Kafka + RabbitMQ | `payment.*` + notifications |

## Production-детали

- `FOR UPDATE SKIP LOCKED` — безопасно при нескольких relay-инстансах;
- retry с лимитом (`OUTBOX_MAX_RETRIES`);
- статус `FAILED` для ручного разбора;
- relay в той же транзакции, что и lock (order-service) или commit после publish batch (Go).

## Dead Letter Queue (DLQ)

После исчерпания retry (`OUTBOX_MAX_RETRIES`) запись получает статус `FAILED`, relay публикует envelope `outbox.dead_letter` в Kafka-топик `dlq.outbox` (env `OUTBOX_DLQ_TOPIC`).

Сообщение остаётся в БД для аудита; DLQ — для алертинга и replay tooling.

### Replay FAILED outbox (локально)

Самый безопасный путь — **вернуть строку в `PENDING`**, чтобы существующий relay опубликовал снова (не писать второй publisher).

```powershell
# Список FAILED в order / inventory / payment
.\backend\scripts\outbox-replay.ps1 -Service order -List
.\backend\scripts\outbox-replay.ps1 -Service inventory -List
.\backend\scripts\outbox-replay.ps1 -Service payment -List

# Посмотреть, что сделает replay (без UPDATE)
.\backend\scripts\outbox-replay.ps1 -Service order -Id <uuid> -DryRun

# Сбросить FAILED → PENDING (нужен контейнер orderflow-postgres)
.\backend\scripts\outbox-replay.ps1 -Service order -Id <uuid>
```

После `-Id` оставь сервис запущенным — relay подхватит `PENDING` на следующем poll.

## Saga compensation

При `payment.failed` `inventory-service` (consumer group `inventory-service-compensation`) освобождает ACTIVE-резервы и возвращает остатки на склад. `order-service` переводит заказ в `FAILED`.

## Следующий уровень (опционально)

- Debezium CDC из outbox table вместо polling relay;
- replay из Kafka `dlq.outbox` (сейчас — reset в БД);
- метрики: lag outbox, publish latency, retry rate.
