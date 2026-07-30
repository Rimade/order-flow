# Build from backend/: docker build -f services/catalog-service/Dockerfile -t orderflow/catalog-service:local .
FROM node:22-alpine AS build
WORKDIR /src
RUN apk add --no-cache openssl
COPY services/catalog-service/package.json services/catalog-service/package-lock.json ./services/catalog-service/
COPY services/catalog-service/prisma ./services/catalog-service/prisma
WORKDIR /src/services/catalog-service
RUN npm ci
COPY services/catalog-service/ ./
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app
COPY --from=build /src/services/catalog-service/dist ./dist
COPY --from=build /src/services/catalog-service/node_modules ./node_modules
COPY --from=build /src/services/catalog-service/package.json ./
COPY --from=build /src/services/catalog-service/prisma ./prisma
COPY services/catalog-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh && chown -R app:app /app
USER app
EXPOSE 3006
ENTRYPOINT ["./docker-entrypoint.sh"]
