# Build from backend/: docker build -f services/api-gateway/Dockerfile -t orderflow/api-gateway:local .
FROM node:22-alpine AS build
WORKDIR /src/services/api-gateway
COPY services/api-gateway/package.json services/api-gateway/package-lock.json ./
RUN npm ci
COPY services/api-gateway/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /src/services/api-gateway/dist ./dist
COPY --from=build /src/services/api-gateway/node_modules ./node_modules
COPY --from=build /src/services/api-gateway/package.json ./
COPY packages/contracts/openapi/orderflow-gateway-v1.yaml ./openapi/orderflow-gateway-v1.yaml
USER app
EXPOSE 3000
CMD ["node", "dist/main"]
