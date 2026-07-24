# Catalog cache (Redis)

По умолчанию `catalog-service` кеширует list/detail в **Redis** (`CACHE_STORE=redis`).

```env
CACHE_STORE=redis
REDIS_URL=redis://localhost:6379
CACHE_TTL_MS=60000
```

| Key | Назначение |
|-----|------------|
| `catalog:products:all` | список |
| `catalog:products:{sku}` | detail |

Fallback для отладки без Redis:

```env
CACHE_STORE=memory
```

## Write + invalidation

После `POST /catalog/products` и `PATCH /catalog/products/:sku` сервис удаляет list + sku keys (не ждёт TTL).

Через gateway write требует JWT; GET остаётся публичным.

```powershell
# login → token
curl -X POST http://localhost:3000/api/v1/catalog/products `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"sku":"sku-9","name":"New Item","price":12.5}'
```

Тот же Redis, что gateway rate limit и order idempotency.
