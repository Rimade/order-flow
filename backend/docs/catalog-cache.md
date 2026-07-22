# Catalog cache (Redis)

По умолчанию `catalog-service` кеширует list/detail в **Redis** (`CACHE_STORE=redis`).

```env
CACHE_STORE=redis
REDIS_URL=redis://localhost:6379
CACHE_TTL_MS=60000
```

Fallback для отладки без Redis:

```env
CACHE_STORE=memory
```

Тот же Redis, что gateway rate limit и order idempotency.

После смены env — перезапусти `catalog-service`. Redis должен быть up (`docker compose` в `backend/infra/compose`).
