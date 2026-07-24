# analytics-service

**Stack:** Go · **Port:** `3007`

Слушает saga Kafka-события и строит агрегаты для дашбордов (orders by status / day, cancel rate).

Собственная БД: `orderflow_analytics` (не shared с order-service).

## Слушает

| Topic | Mapped status |
|-------|----------------|
| `order.created` | `PENDING` |
| `inventory.reserved` | `PAYMENT_PENDING` |
| `inventory.rejected` | `CANCELLED` |
| `payment.succeeded` | `CONFIRMED` |
| `payment.failed` | `FAILED` |

Идемпотентность по `eventId`. Счётчики — **число событий** (воронка), не «текущий статус одного заказа».

## HTTP

| Method | Path | Описание |
|--------|------|----------|
| GET | `/health` | service + DB |
| GET | `/metrics` | Prometheus (+ `analytics_events_*`) |
| GET | `/api/v1/analytics/summary` | totals + funnel + cancelRate |
| GET | `/api/v1/analytics/orders-by-day?days=7` | daily breakdown |

Gateway proxy **не** нужен — curl/Grafana бьют на `:3007`.

## Запуск

1. БД (один раз, если compose уже был поднят раньше):

```sql
CREATE DATABASE orderflow_analytics;
```

2. Env:

```powershell
cd backend\services\analytics-service
copy .env.example .env
go mod tidy
go run ./cmd/server
```

CWD должен быть `analytics-service/` (migrations читаются относительно CWD).

Docs: [analytics.md](../../docs/analytics.md).
