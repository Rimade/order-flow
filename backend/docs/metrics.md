# Metrics (Prometheus + Grafana)

## Локальный стек

```bash
cd backend/infra/compose
docker compose --profile observability up -d
```

| UI | URL | Логин |
| --- | --- | --- |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3100 | `admin` / `admin` |

Сервисы на хосте должны быть запущены — Prometheus скрейпит через `host.docker.internal`.

## Эндпоинты

| Сервис | `/metrics` |
| ------ | ---------- |
| api-gateway | :3000 |
| auth-service | :3001 |
| order-service | :3002 |
| inventory-service | :3003 |
| payment-service | :3004 |
| notification-service | :3005 |
| catalog-service | :3006 |
| analytics-service | :3007 |

## HTTP

`http_requests_total`, `http_request_duration_seconds` + process defaults.

## Бизнес-метрики (saga)

| Метрика | Сервис |
| ------- | ------ |
| `orders_created_total` | order-service |
| `orders_status_transitions_total{status}` | order-service |
| `inventory_reservations_total{result}` | inventory (`reserved` / `rejected`) |
| `inventory_compensations_total` | inventory |
| `payments_total{result}` | payment (`succeeded` / `failed`) |
| `analytics_events_processed_total` | analytics |
| `analytics_events_skipped_total` | analytics |

## Grafana

Дашборд **OrderFlow Overview**: HTTP rate/p95 + orders/inventory/payments panels.
