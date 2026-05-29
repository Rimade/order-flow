# contracts

Общие контракты между сервисами: event schemas, DTO, OpenAPI, protobuf (если понадобится).

## OpenAPI (gateway)

- Спека: [openapi/orderflow-gateway-v1.yaml](./openapi/orderflow-gateway-v1.yaml)
- Генерация типов для клиента:

```powershell
cd client
pnpm codegen
```

Результат: `client/packages/api-client/src/generated/schema.d.ts`
