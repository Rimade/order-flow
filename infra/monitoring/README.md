# Monitoring (Prometheus + Grafana)

Локальный стек метрик для OrderFlow.

## Запуск

```bash
cd infra/compose
docker compose up -d prometheus grafana
```

| Сервис | URL |
| ------ | --- |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3100 (`admin` / `admin`) |

Сервисы приложения должны работать на хосте — Prometheus скрейпит `host.docker.internal`.

## Конфигурация

- `prometheus/prometheus.yml` — targets saga-сервисов
- `grafana/provisioning/` — datasource + дашборд **OrderFlow Overview**

Подробнее: `docs/metrics.md`.
