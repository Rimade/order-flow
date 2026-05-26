# RabbitMQ

В OrderFlow **RabbitMQ** используется для task-queue сценариев (уведомления), а **Kafka** — для domain events между core-сервисами.

## Локальный доступ

- AMQP: `localhost:5672`
- Management UI: http://localhost:15672
- user/pass по умолчанию: `orderflow` / `orderflow`

## Топология (foundation)

| Компонент | Значение                    |
| --------- | --------------------------- |
| Exchange  | `orderflow.notifications`   |
| Type      | `topic`                     |
| Queue     | `notification-service.queue`|
| Binding   | `notification.#`            |

## Routing keys

- `notification.payment.succeeded`
- `notification.payment.failed`

Producer: `payment-service`  
Consumer: `notification-service`
