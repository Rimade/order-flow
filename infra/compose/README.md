# Local Compose Stack

Локальная инфраструктура для разработки `OrderFlow`.

## Сервисы

| Сервис    | Порт по умолчанию | Назначение              |
| --------- | ----------------- | ----------------------- |
| postgres  | 5432              | основная БД             |
| redis     | 6379              | кэш и ephemeral state   |
| kafka     | 9092              | event bus               |
| kafka-ui  | 8080              | просмотр топиков        |
| rabbitmq  | 5672 / 15672      | task queue / UI         |
| jaeger    | 16686 / 4318      | tracing UI / OTLP HTTP  |
| prometheus | 9090             | метрики                 |
| grafana   | 3100              | дашборды                |

## Запуск

```bash
cd infra/compose
cp .env.example .env
docker compose up -d
```

Проверка статуса:

```bash
docker compose ps
```

Остановка:

```bash
docker compose down
```

## Подключение из сервисов

- PostgreSQL: `postgresql://orderflow:orderflow@localhost:5432/orderflow`
- Redis: `redis://localhost:6379`
- Kafka: `localhost:9092`
- RabbitMQ: `amqp://orderflow:orderflow@localhost:5672/`
- RabbitMQ UI: http://localhost:15672
- Jaeger UI: http://localhost:16686
- OTLP HTTP: http://localhost:4318/v1/traces
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3100

При первом запуске Postgres создает отдельные БД для сервисов, начиная с `orderflow_auth` для `auth-service`.

Каждый сервис владеет своей БД. Общий Postgres-инстанс допустим только для локальной разработки.
