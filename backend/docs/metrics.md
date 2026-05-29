# Metrics (Prometheus + Grafana)

## Локальный стек

```bash
cd backend/infra/compose
docker compose up -d prometheus grafana
```

| UI | URL | Логин |
| --- | --- | --- |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3100 | `admin` / `admin` |

Сервисы на хосте должны быть запущены — Prometheus скрейпит `host.docker.internal:3000` и порты saga-сервисов.

## Эндпоинты

| Сервис | `/metrics` |
| ------ | ---------- |
| api-gateway | :3000 |
| order-service | :3002 |
| inventory-service | :3003 |
| payment-service | :3004 |

Метрики: `http_requests_total`, `http_request_duration_seconds` + default process metrics (Go).

## Grafana

После старта открой дашборд **OrderFlow Overview** (папка OrderFlow).
