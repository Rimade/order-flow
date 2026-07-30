# Build from backend/: docker build -f services/auth-service/Dockerfile -t orderflow/auth-service:local .
FROM node:22-alpine AS build
WORKDIR /src
RUN apk add --no-cache openssl
COPY services/auth-service/package.json services/auth-service/package-lock.json ./services/auth-service/
COPY services/auth-service/prisma ./services/auth-service/prisma
WORKDIR /src/services/auth-service
RUN npm ci
COPY services/auth-service/ ./
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app
COPY --from=build /src/services/auth-service/dist ./dist
COPY --from=build /src/services/auth-service/node_modules ./node_modules
COPY --from=build /src/services/auth-service/package.json ./
COPY --from=build /src/services/auth-service/prisma ./prisma
COPY services/auth-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh && chown -R app:app /app
USER app
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
