# Analytics service

Учебный event-driven read-model: Kafka saga → Postgres aggregates → HTTP/Prometheus.

## Идея

`order-service` **не** публикует `order.confirmed` / `order.cancelled`. Analytics выводит статусы из тех же событий, что двигают сагу:

```text
order.created          → PENDING
inventory.reserved     → PAYMENT_PENDING
inventory.rejected     → CANCELLED
payment.succeeded      → CONFIRMED
payment.failed         → FAILED
```

## API

База: `http://localhost:3007`

```powershell
curl http://localhost:3007/api/v1/analytics/summary
curl "http://localhost:3007/api/v1/analytics/orders-by-day?days=7"
```

`cancelRate` = `CANCELLED / PENDING` (по счётчикам событий).

## Метрики

- `analytics_events_processed_total{event_type,mapped_status}`
- `analytics_events_skipped_total{reason}`
- стандартные `http_*` через shared-observability

Prometheus scrape: `host.docker.internal:3007` (profile `observability`).

Если volume Postgres уже был создан **до** появления `orderflow_analytics`, создай БД вручную:

```sql
CREATE DATABASE orderflow_analytics;
```
