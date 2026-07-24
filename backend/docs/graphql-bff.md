# GraphQL BFF (api-gateway)

Учебный read-model на gateway. **Не** заменяет REST и **не** живёт внутри domain-сервисов.

## Зачем

Экраны вроде «заказ + позиции + актуальные поля каталога» иначе требуют нескольких REST-вызовов. GraphQL на edge агрегирует их в один query.

## Границы

| Делаем в GraphQL | Оставляем REST |
| ---------------- | -------------- |
| `order(id)` + enrichment catalog | login / refresh / logout |
| `me { orders }` + enrichment catalog | `POST /orders` (+ Idempotency-Key) |
| | SSE `/orders/:id/events` |
| | saga / Kafka / outbox |

## Endpoint

- URL: `POST http://localhost:3000/graphql` (Apollo Sandbox: `GET /graphql`)
- Auth: `Authorization: Bearer <accessToken>` (как у REST orders)
- Schema: code-first, in-memory (`autoSchemaFile: true`)

### Пример

```graphql
query OrderDetails($id: ID!) {
  order(id: $id) {
    id
    status
    totalAmount
    currency
    items {
      productId
      productName
      quantity
      unitPrice
      catalog {
        sku
        name
        price
        category
      }
    }
  }
}
```

`catalog` может быть `null`, если product не найден или catalog-service недоступен (заказ всё равно возвращается).

### Список заказов текущего пользователя

```graphql
query MyOrders {
  me {
    id
    email
    orders {
      id
      status
      totalAmount
      currency
      items {
        productId
        productName
        quantity
        catalog {
          sku
          name
          price
        }
      }
    }
  }
}
```

Список ходит в `GET /api/v1/orders` на order-service, затем обогащает уникальные `productId` через catalog (кэш на запрос).

## Локально

1. Gateway + order-service + catalog-service запущены.
2. Получи JWT через `/api/v1/auth/login`.
3. Открой http://localhost:3000/graphql → Headers: `{"Authorization":"Bearer …"}`.

См. также: [openapi.md](./openapi.md) (REST — source of truth сервисов).
