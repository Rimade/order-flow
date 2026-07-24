# Saga reliability tests

Автопроверки поверх живого стека (gateway + order + Redis + saga-сервисы).

| Сценарий | Как запускать | Ожидание |
|----------|---------------|----------|
| Idempotency replay | `cd client && pnpm e2e:idempotency` | тот же `order.id` |
| Idempotency mismatch | (в том же спеке) | `422` |
| Inventory reject | `pnpm e2e -- order-reject` | UI `Отменён` |
| Payment fail | `PAYMENT_SIMULATE_SUCCESS=false` + `E2E_PAYMENT_FAIL=1` + `pnpm e2e:payment-fail` | статус `FAILED` |

Без браузера:

```powershell
node backend/scripts/smoke-reliability.mjs
```

Compensation inventory после `payment.failed` проверяется косвенно (заказ `FAILED` + метрика `inventory_compensations_total` / логи inventory). Отдельного read-API остатков нет.
