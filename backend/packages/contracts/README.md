# contracts

Общие контракты между сервисами: event schemas, DTO, OpenAPI, protobuf (если понадобится).

## OpenAPI (gateway)

- Спека: [openapi/orderflow-gateway-v1.yaml](./openapi/orderflow-gateway-v1.yaml)
- Swagger UI (runtime): http://localhost:3000/docs — см. [../../docs/openapi.md](../../docs/openapi.md)
- Генерация типов для клиента:

```powershell
cd client
pnpm codegen
```

Результат: `client/packages/api-client/src/generated/schema.d.ts`
