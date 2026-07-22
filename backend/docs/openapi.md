# OpenAPI / Swagger

## Source of truth

Контракт API для клиента:

`backend/packages/contracts/openapi/orderflow-gateway-v1.yaml`

Генерация типов:

```powershell
cd client
pnpm codegen
```

## Swagger UI

При запуске **api-gateway** UI доступен без JWT:

http://localhost:3000/docs

Документ загружается из YAML contracts (не автоген из Nest-handlers — gateway в основном прокси).

Проверка файла:

```powershell
cd backend\services\api-gateway
npm run openapi:check
```

## Workflow

1. Меняешь YAML (новый path / schema).
2. `pnpm codegen` в `client`.
3. Перезапускаешь gateway — `/docs` подхватит YAML.
4. При необходимости обновишь ручной `api-client` (fetch-обёртки).
