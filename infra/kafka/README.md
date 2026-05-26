# Kafka

## Топики (foundation)

| Topic           | Producer        | Consumers (planned)     |
| --------------- | --------------- | ----------------------- |
| `order.created` | `order-service` | `inventory-service`     |

## Локальная разработка

Kafka поднимается через `infra/compose`. UI: http://localhost:8080

После создания заказа проверь топик `order.created` в Kafka UI.

## Naming conventions

- события: `domain.action` (`order.created`, `payment.failed`);
- ключ сообщения: id агрегата (`orderId`);
- headers: `event-type`, `event-id`.
