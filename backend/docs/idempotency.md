# Idempotency (create order)

## Зачем

Двойной клик / retry клиента не должен создавать два заказа. Клиент шлёт заголовок `Idempotency-Key`; сервис кеширует ответ в Redis.

## Контракт

```http
POST /api/v1/orders
Authorization: Bearer …
Idempotency-Key: <uuid>
Content-Type: application/json
```

| Ситуация | Ответ |
|----------|--------|
| Первый запрос с ключом | `201` + тело заказа; ключ сохранён на TTL |
| Повтор с тем же ключом и телом | `201` + **то же** тело (без нового заказа) |
| Тот же ключ, другое тело | `422` |
| Параллельный запрос с тем же ключом | `409` |
| Без заголовка | обычный create (без кеша) |

Ключ Redis: `order:idem:{userId}:{Idempotency-Key}`  
TTL: `IDEMPOTENCY_TTL_SECONDS` (по умолчанию 86400).

## Конфиг (`order-service`)

```env
IDEMPOTENCY_ENABLED=true
REDIS_URL=redis://localhost:6379
IDEMPOTENCY_TTL_SECONDS=86400
```

`IDEMPOTENCY_ENABLED=false` — Redis не подключается, заголовок игнорируется.

## Клиент

`@orderflow/api-client` на каждый `orders.create` генерирует новый `Idempotency-Key` (`crypto.randomUUID()`).

## Автотесты

Playwright (нужен поднятый backend + Redis idempotency):

```powershell
cd client
pnpm e2e -- order-idempotency
```

Payment fail + compensation (отдельный прогон):

```powershell
# payment-service: PAYMENT_SIMULATE_SUCCESS=false
$env:E2E_PAYMENT_FAIL='1'
pnpm e2e -- order-payment-fail
```

Или API smoke без браузера:

```powershell
node backend/scripts/smoke-reliability.mjs
```
