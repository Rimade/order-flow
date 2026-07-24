# catalog-service

**Stack:** NestJS + Prisma + PostgreSQL

Каталог товаров (read API). Данные владеет только этот сервис — inventory не читает catalog DB напрямую.

## API

| Метод | Путь | Auth |
|-------|------|------|
| GET | `/api/v1/catalog/products` | публично (через gateway) |
| GET | `/api/v1/catalog/products/:sku` | публично |
| POST | `/api/v1/catalog/products` | JWT (gateway) |
| PATCH | `/api/v1/catalog/products/:sku` | JWT (gateway) |

Write инвалидирует Redis keys `catalog:products:all` и `catalog:products:{sku}` — см. [catalog-cache.md](../../docs/catalog-cache.md).

## Локальный запуск

Если Postgres уже был поднят до появления `orderflow_catalog`, создай БД один раз:

```powershell
docker exec -it orderflow-postgres psql -U orderflow -c "CREATE DATABASE orderflow_catalog;"
```

(имя контейнера смотри в `docker compose ps`)

В **api-gateway** `.env` добавь: `CATALOG_SERVICE_URL=http://localhost:3006`

```powershell
cd backend\services\catalog-service
copy .env.example .env
npm install
npm run prisma:migrate:dev
npm run start:dev
```

Порт: **3006**. Health: `http://localhost:3006/health`

## Seed-товары

| SKU | Назначение |
|-----|------------|
| `sku-1` | успешный заказ |
| `sku-2` | второй товар |
| `sku-4` | демо отмены (inventory) |

## Кэш

In-memory cache (`@nestjs/cache-manager`), TTL `CACHE_TTL_MS` (по умолчанию 60 с).
