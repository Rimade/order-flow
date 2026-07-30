# Build from backend/: docker build -f services/order-service/Dockerfile -t orderflow/order-service:local .
FROM node:22-alpine AS build
WORKDIR /src
RUN apk add --no-cache openssl
COPY services/order-service/package.json services/order-service/package-lock.json ./services/order-service/
COPY services/order-service/prisma ./services/order-service/prisma
WORKDIR /src/services/order-service
RUN npm ci
COPY services/order-service/ ./
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app
COPY --from=build /src/services/order-service/dist ./dist
COPY --from=build /src/services/order-service/node_modules ./node_modules
COPY --from=build /src/services/order-service/package.json ./
COPY --from=build /src/services/order-service/prisma ./prisma
COPY services/order-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh && chown -R app:app /app
USER app
EXPOSE 3002
ENTRYPOINT ["./docker-entrypoint.sh"]
