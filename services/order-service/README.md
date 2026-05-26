# order-service

**Stack:** NestJS + Prisma + PostgreSQL + Kafka

Сервис заказов OrderFlow: создание заказа, чтение списка и деталей, публикация события `order.created` в Kafka.

**Порт по умолчанию:** `3002`  
**БД:** `orderflow_order`

## API

| Метод | Путь                 | Auth | Описание           |
| ----- | -------------------- | ---- | ------------------ |
| POST  | `/api/v1/orders`     | JWT  | создать заказ      |
| GET   | `/api/v1/orders`     | JWT  | список своих заказов |
| GET   | `/api/v1/orders/:id` | JWT  | детали заказа      |
| GET   | `/health`            | —    | healthcheck        |

Рекомендуется вызывать через `api-gateway` (`http://localhost:3000`).

## Kafka

После создания заказа публикуется событие в топик `order.created` (настраивается через `KAFKA_ORDER_TOPIC`).

Формат сообщения:

```json
{
  "eventId": "uuid",
  "eventType": "order.created",
  "occurredAt": "2026-05-26T12:00:00.000Z",
  "data": {
    "orderId": "uuid",
    "userId": "uuid",
    "status": "PENDING",
    "totalAmount": "199.98",
    "currency": "USD",
    "items": []
  }
}
```

> Следующий production-шаг: transactional outbox вместо прямой публикации после insert.

## Запуск

```bash
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

Требуется запущенные Postgres, Kafka и совпадающий `JWT_ACCESS_SECRET` с `auth-service` / `api-gateway`.

## Пример через gateway

```bash
# 1. Получить accessToken (login/register)
# 2. Создать заказ
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"productId\":\"sku-1\",\"productName\":\"Demo Product\",\"quantity\":2,\"unitPrice\":99.99}]}"
```
