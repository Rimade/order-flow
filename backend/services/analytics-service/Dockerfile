# Build from backend/: docker build -f services/analytics-service/Dockerfile -t orderflow/analytics-service:local .
FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY packages/shared-observability/go ./packages/shared-observability/go
COPY services/analytics-service ./services/analytics-service
WORKDIR /src/services/analytics-service
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM alpine:3.21 AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /out/server ./server
COPY services/analytics-service/migrations ./migrations
USER app
EXPOSE 3007
CMD ["./server"]
