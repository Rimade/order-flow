# Outbox ops UI

Учебная ops-панель для **order-service** outbox.

## UI

http://localhost:4000/ops/outbox (пункт меню **Ops**)

- Список `outbox_messages` со статусом `FAILED`
- **Replay** → `PENDING`, `retry_count=0` — relay публикует снова

Скрыть: `VITE_OPS_ENABLED=false` в `client/.env`.

## API

```http
GET  /api/v1/ops/outbox/failed?limit=50
POST /api/v1/ops/outbox/{id}/replay
Authorization: Bearer …
```

## Inventory / payment

Go-сервисы: используй CLI

```powershell
.\backend\scripts\outbox-replay.ps1 -Service inventory -List
.\backend\scripts\outbox-replay.ps1 -Service payment -Id <uuid>
```

См. [outbox-pattern.md](./outbox-pattern.md), [dlq-and-compensation.md](./dlq-and-compensation.md).
