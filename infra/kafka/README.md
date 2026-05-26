# Kafka

## Топики (foundation)

| Topic                 | Producer            | Consumers               |
| --------------------- | ------------------- | ----------------------- |
| `order.created`       | `order-service`     | `inventory-service`     |
| `inventory.reserved`  | `inventory-service` | `payment-service`       |
| `inventory.rejected`  | `inventory-service` | — (planned: order)      |
| `payment.succeeded`   | `payment-service`   | — (planned: order)      |
| `payment.failed`      | `payment-service`   | — (planned: order)      |

## Локальная разработка

Kafka поднимается через `infra/compose`. UI: http://localhost:8080

После создания заказа проверь топик `order.created` в Kafka UI.

## Naming conventions

- события: `domain.action` (`order.created`, `payment.failed`);
- ключ сообщения: id агрегата (`orderId`);
- headers: `event-type`, `event-id`.
