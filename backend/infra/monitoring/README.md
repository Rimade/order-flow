# Monitoring (Prometheus + Grafana)

Локальный стек метрик для OrderFlow.

## Запуск

```bash
cd backend/infra/compose
docker compose --profile observability up -d
```

| Сервис | URL |
| ------ | --- |
| Prometheus | <http://localhost:9090> |
| Grafana | <http://localhost:3100> (`admin` / `admin`) |

Сервисы приложения должны работать на хосте — Prometheus скрейпит `host.docker.internal`.

## Конфигурация

- `prometheus/prometheus.yml` — targets saga-сервисов
- `grafana/provisioning/` — datasource + дашборд **OrderFlow Overview**

Подробнее: `backend/docs/metrics.md`.
