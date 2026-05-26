# shared-observability

Общие утилиты для distributed tracing (OpenTelemetry).

## Структура

| Путь | Назначение |
| ---- | ---------- |
| `go/telemetry/` | Init OTLP exporter + Kafka W3C propagation (Go) |
| `nodejs/tracing.ts` | Эталон для NestJS (`NodeSDK` + auto-instrumentation) |
| `nodejs/kafka-propagation.ts` | inject/extract `traceparent` в Kafka headers |

NestJS-сервисы держат копию в `src/telemetry/` (см. `api-gateway`, `order-service`).

## Go

```go
replace orderflow/shared-observability => ../../packages/shared-observability/go

shutdown, err := telemetry.Init(ctx, "inventory-service")
headers := telemetry.InjectKafkaHeaders(ctx, headers)
ctx = telemetry.ExtractContext(ctx, message.Headers)
```

Подробнее: `docs/observability.md`.
