# Observability (OpenTelemetry + Jaeger)

## Локальный стек

```bash
cd backend/infra/compose
docker compose up -d jaeger
```

- **Jaeger UI:** http://localhost:16686
- **OTLP HTTP:** `http://localhost:4318/v1/traces`

## Включение в сервисах

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=order-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Go-сервисы используют `OTEL_SERVICE_NAME` из env или имя по умолчанию в `main`.

## Трассировка saga

| Участок | Как связано |
| ------- | ----------- |
| Client → gateway | W3C `traceparent` (auto HTTP instrumentation) |
| gateway → order-service | Axios propagation |
| order → Kafka | inject в headers сообщения |
| inventory / payment | extract + child spans |
| payment → RabbitMQ | HTTP/RMQ — отдельный span при расширении |

## Проверка

1. Включи `OTEL_ENABLED=true` в gateway, order, inventory, payment.
2. Создай заказ через gateway.
3. В Jaeger UI найди trace по `order-service` или `api-gateway`.

## Дальше

- Prometheus metrics + Grafana dashboards;
- span metrics и alert на error rate;
- baggage для `x-request-id` в логах.
