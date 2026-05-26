# OrderFlow

`OrderFlow` - учебный production-like backend-проект для практики микросервисной архитектуры на смешанном стеке `NestJS` + `Go`.

Цель репозитория - не просто собрать CRUD, а пошагово построить систему обработки заказов с актуальными инфраструктурными и platform-практиками: `Kafka`, `Redis`, `PostgreSQL`, `Docker Compose`, `OpenTelemetry`, `Prometheus`, `Grafana`, `Jaeger`.

## Структура репозитория

```text
/
  docs/           # архитектура и git workflow
  infra/          # docker compose, kafka, monitoring
  services/       # микросервисы (NestJS + Go)
  packages/       # общие контракты и shared libs
```

## Что внутри

- `docs/project-blueprint.md` - главный архитектурный документ проекта;
- `docs/git-workflow.md` - правила коммитов и ведения истории;
- `infra/compose/` - локальный стек PostgreSQL, Redis, Kafka, Kafka UI;
- `services/` - каталоги сервисов со skeleton README;
- `.cursor/rules/` - постоянный контекст и conventions для работы через Cursor.

## Домен

Проект моделирует backend интернет-магазина с event-driven обработкой заказов:

1. пользователь проходит аутентификацию;
2. просматривает каталог;
3. создает заказ;
4. система резервирует остатки;
5. система инициирует оплату;
6. заказ получает итоговый статус;
7. отправляются уведомления;
8. события уходят в аналитику.

## Планируемые сервисы

### NestJS

- `api-gateway`
- `auth-service`
- `catalog-service`
- `order-service`

### Go

- `inventory-service`
- `payment-service`
- `notification-service`
- `analytics-service`

## Технологии

- `NestJS`
- `Go`
- `Kafka`
- `Redis`
- `PostgreSQL`
- `Docker Compose`
- `OpenTelemetry`
- `Prometheus`
- `Grafana`
- `Jaeger`

## Как работать с проектом

Пока репозиторий находится на этапе foundation:

- архитектурные изменения сначала фиксируются в `docs/project-blueprint.md`;
- коммиты оформляются по `Conventional Commits`;
- изменения держим маленькими и логически цельными;
- новый сервис добавляем только с понятной зоной ответственности.

## Локальный запуск инфраструктуры

```bash
cd infra/compose
cp .env.example .env
docker compose up -d
```

После старта:

- Kafka UI: http://localhost:8080
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kafka: `localhost:9092`

Подробнее: `infra/compose/README.md`.

## Ближайшие шаги

- завести первый NestJS-сервис (`api-gateway` или `auth-service`);
- завести первый Go-сервис (`inventory-service` или `payment-service`);
- подключить Kafka event flow между сервисами.
