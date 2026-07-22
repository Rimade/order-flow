# Order status SSE

## Зачем

Polling каждые 2 с работает, но держит лишний HTTP. SSE шлёт событие только при смене статуса и закрывает поток на терминале (`CONFIRMED` / `CANCELLED` / `FAILED`).

## Endpoint

```http
GET /api/v1/orders/{id}/events
Authorization: Bearer …
Accept: text/event-stream
```

Событие:

```text
data: {"orderId":"...","status":"PAYMENT_PENDING","updatedAt":"..."}
```

Реализация: order-service поллит БД ~1.5 с и пишет SSE. Gateway проксирует **stream** (не axios), чтобы не буферить тело.

## Клиент

`watchOrderStatus(id, { onEvent, onError })` в `@orderflow/api-client` — `fetch` + ReadableStream (нужен Bearer; native `EventSource` заголовки не шлёт).

На ошибке SSE страница заказа падает обратно на `refetchInterval: 2000`.
