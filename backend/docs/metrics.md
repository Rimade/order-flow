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

Метрики: `http_requests_total`, `http_request_duration_seconds` + default process metrics.
Analytics также отдаёт `analytics_events_processed_total` / `analytics_events_skipped_total`.

## Grafana

После старта открой дашборд **OrderFlow Overview** (папка OrderFlow) — rate и p95 группируются по label `service`.
