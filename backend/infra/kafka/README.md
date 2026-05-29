# Kafka

## Топики (foundation)

| Topic                 | Producer            | Consumers               |
| --------------------- | ------------------- | ----------------------- |
| `order.created`       | `order-service`     | `inventory-service`     |
| `inventory.reserved`  | `inventory-service` | `payment-service`       |
| `inventory.rejected`  | `inventory-service` | — (planned: order)      |
| `payment.succeeded`   | `payment-service`   | `order-service`         |
| `payment.failed`      | `payment-service`   | `order-service`, `inventory-service` (compensation) |
| `inventory.reserved`  | `inventory-service` | `order-service`, `payment-service` |
| `inventory.rejected`  | `inventory-service` | `order-service`         |
| `dlq.outbox`          | producer relays     | ops / replay (manual)   |

## Локальная разработка

Kafka поднимается через `backend/infra/compose`. UI: http://localhost:8080

После создания заказа проверь топик `order.created` в Kafka UI.

## Naming conventions

- события: `domain.action` (`order.created`, `payment.failed`);
- ключ сообщения: id агрегата (`orderId`);
- headers: `event-type`, `event-id`.
