# Observability runbook: один заказ end-to-end

Цель: увидеть **happy path** заказа в Jaeger и метрики в Grafana/Prometheus.

## 1. Поднять стек

```powershell
cd backend\infra\compose
docker compose up -d
docker compose --profile observability up -d
```

| UI | URL |
|----|-----|
| Jaeger | http://localhost:16686 |
| Grafana | http://localhost:3100 (`admin` / `admin`) |
| Prometheus | http://localhost:9090 |
| Kafka UI | http://localhost:8080 |

## 2. Включить трассировку в сервисах

В `.env` у **api-gateway**, **order-service**, **inventory-service**, **payment-service**:

```env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

`OTEL_SERVICE_NAME` уже задан в `.env.example` каждого сервиса. Перезапусти процессы после смены env.

## 3. Создать заказ

Через UI http://localhost:4000 → **Заказ sku-1 (OK)**  
или curl на `POST http://localhost:3000/api/v1/orders` с JWT.

Дождись статуса **Подтверждён**.

## 4. Найти trace в Jaeger

1. Открой http://localhost:16686  
2. Service: `api-gateway` или `order-service`  
3. Find Traces → открой самый свежий  

Ожидаемая цепочка (упрощённо):

```text
api-gateway  (HTTP POST /api/v1/orders)
  └─ order-service (create + outbox)
       └─ (Kafka) inventory-service
            └─ (Kafka) payment-service
                 └─ order-service (CONFIRMED)
```

Если spans обрываются на Kafka — проверь, что OTEL включён во всех четырёх сервисах и Jaeger слушает `:4318`.

## 5. Метрики

1. Prometheus targets: http://localhost:9090/targets — gateway/order/inventory/payment должны быть UP (скрейп через `host.docker.internal`).  
2. Grafana http://localhost:3100 → дашборд **OrderFlow Overview** (если provisioning настроен).  
3. Сырые метрики: http://localhost:3000/metrics , `:3002/metrics`, …

## 6. Failure path (для сравнения)

| Сценарий | Что смотреть |
|----------|----------------|
| sku-4 → CANCELLED | короткий trace до `inventory.rejected`, без payment success |
| `PAYMENT_SIMULATE_SUCCESS=false` → FAILED | payment.failed + compensation spans |

## 7. Когда observability не нужна

Для обычной проверки саги достаточно UI + Kafka UI. Observability — для обучения tracing/metrics и отладки latency.

Связанные docs: [metrics.md](./metrics.md), [idempotency.md](./idempotency.md), [outbox-pattern.md](./outbox-pattern.md).
