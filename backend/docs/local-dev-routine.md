# Локальная разработка: как начинать и заканчивать работу

Пошаговая инструкция для ежедневной работы с OrderFlow на Windows (подойдёт и для macOS/Linux с заменой команд копирования).

**Для кого:** если вы в основном на фронте и хотите стабильно поднимать/гасить стек без «угадывания», что запущено.

**Связанные документы:**

- [infra/compose/README.md](../infra/compose/README.md) — порты и compose
- [README.md](../../README.md) — обзор репозитория
- [project-blueprint.md](./project-blueprint.md) — архитектура backend
- [client/docs/microfrontends.md](../../client/docs/microfrontends.md) — план фронтенда
- [client/README.md](../../client/README.md) — monorepo фронтенда
- [client/docs/ui-kit.md](../../client/docs/ui-kit.md) — дизайн-система `@orderflow/ui`

---

## 1. Два слоя: что вообще крутится

| Слой | Что входит | Как запускается | Можно оставить на ночь? |
|------|------------|-----------------|-------------------------|
| **Инфра** | Postgres, Redis, Kafka, RabbitMQ, Kafka UI | Docker Compose | Да, часто так и делают |
| **Приложения** | auth, gateway, order, catalog (Nest) + inventory, payment, notification (Go) | Отдельные терминалы | Лучше остановить (Ctrl+C) |

Клиент (браузер, Postman, будущий фронт) ходит **только** в gateway:

```text
http://localhost:3000/api/v1/...
```

Прямые порты сервисов (3001, 3002, …) — для отладки и health, не для UI.

---

## 2. Что должно быть установлено (один раз)

| Инструмент | Зачем | Проверка |
|------------|-------|----------|
| **Docker Desktop** | Postgres, Kafka, Redis, RabbitMQ | `docker version` |
| **Node.js** 20+ (лучше 22) | Nest-сервисы | `node -v` |
| **Go** 1.22+ | inventory, payment, notification | `go version` |
| **Git** | репозиторий | `git --version` |

Опционально: Thunder Client / Postman / Insomnia для HTTP.

---

## 3. Первый запуск (один раз на машине)

### 3.1. Клонировать и открыть проект

```powershell
cd C:\Users\Amin\Desktop\kafka_microservices_redis
```

(путь замените на свой)

### 3.2. Инфраструктура (Docker)

```powershell
cd backend\infra\compose
copy .env.example .env
docker compose up -d
docker compose ps
```

Должны быть **running/healthy**: `postgres`, `redis`, `kafka`, `rabbitmq`.
`kafka-ui` — полезен для просмотра топиков (порт 8080).

**Важно про PostgreSQL на Windows:** если установлен локальный PostgreSQL (часто порт **5432**), Docker в этом проекте слушает **5433** на хосте. Все `DATABASE_URL` в сервисах должны использовать `:5433`, не `:5432`. См. раздел [Конфликт порта 5432](#конфликт-порта-5432-windows).

Скрипт из корня репозитория:

```powershell
.\backend\scripts\dev-up.ps1

### 3.3. Подготовить `.env` у сервисов

В каждой папке сервиса (первый раз):

```powershell
cd backend\services\auth-service
copy .env.example .env
npm install
npm run prisma:migrate:dev
```

Повторить логику для:

| Сервис | Папка | Дополнительно |
|--------|-------|---------------|
| auth | `backend/services/auth-service` | `prisma:migrate:dev` |
| gateway | `backend/services/api-gateway` | `npm install` |
| order | `backend/services/order-service` | `prisma:migrate:dev` |
| inventory | `backend/services/inventory-service` | `go mod download` |
| payment | `backend/services/payment-service` | `go mod download` |
| notification | `backend/services/notification-service` | `go mod download` |

**Секрет JWT:** в `api-gateway/.env` значение `JWT_ACCESS_SECRET` **должно совпадать** с `auth-service/.env`.

### 3.4. Проверка после первого запуска

1. Запустить auth и gateway (см. раздел 4).
2. `GET http://localhost:3001/health` → `"database": { "status": "up" }`.
3. `GET http://localhost:3000/health` → gateway отвечает.

---

## 4. Начало рабочего дня (каждый день)

### Шаг 1 — Docker (~30 секунд)

```powershell
cd backend\infra\compose
docker compose up -d
docker compose ps
```

Или из корня:

```powershell
.\backend\scripts\dev-up.ps1
.\backend\scripts\dev-ps.ps1
```

Если контейнеры уже созданы, команда только «разбудит» их.

### Шаг 2 — выбрать, какие сервисы нужны

| Задача | Что запускать |
|--------|----------------|
| Только регистрация / логин | Docker + **auth** + **gateway** |
| Создать заказ, сага, Kafka | + **order** + **inventory** + **payment** + **notification** |
| Каталог в UI (фаза 2) | + **catalog** (:3006) |
| Смотреть топики | достаточно Docker (Kafka UI :8080) |
| Метрики / трейсы | `docker compose --profile observability up -d` |

### Шаг 3 — терминалы с приложениями

Рекомендуемый **порядок** и **имена вкладок** в терминале:

| Вкладка | Папка | Команда |
|---------|-------|---------|
| `infra` | `backend/infra/compose` | уже `docker compose up -d` |
| `auth` | `backend/services/auth-service` | `npm run start:dev` |
| `gateway` | `backend/services/api-gateway` | `npm run start:dev` |
| `order` | `backend/services/order-service` | `npm run start:dev` |
| `catalog` | `backend/services/catalog-service` | `npm run start:dev` (в `.env`: `CACHE_STORE=memory` или `redis` + `REDIS_URL`) |
| `inventory` | `backend/services/inventory-service` | `go run ./cmd/server` |
| `payment` | `backend/services/payment-service` | `go run ./cmd/server` |
| `notification` | `backend/services/notification-service` | `go run ./cmd/server` |

Дождитесь в логах Nest: `Nest application successfully started`.

### Шаг 4 — быстрый health-check

| URL | Ожидание |
|-----|----------|
| <http://localhost:3001/health> | auth, БД `up` |
| <http://localhost:3000/health> | gateway OK |
| <http://localhost:3002/health> | order (если запущен) |
| <http://localhost:3006/health> | catalog (если запущен) |
| <http://localhost:3000/api/v1/catalog/products> | список товаров (публично) |
| <http://localhost:8080> | Kafka UI (если Docker up) |

Скрипт проверки:

```powershell
.\backend\scripts\dev-check.ps1
```

---

## 5. Конец рабочего дня

### Вариант A — обычный (рекомендуется)

1. Во всех терминалах с `npm run start:dev` и `go run` — **Ctrl+C**.
2. Docker **можно не останавливать** — завтра снова `docker compose up -d` займёт секунды.
3. Закрыть IDE.

Данные (пользователи, заказы) **сохраняются** в Docker volume.

### Вариант B — освободить RAM/CPU

```powershell
cd backend\infra\compose
docker compose down
```

Или:

```powershell
.\backend\scripts\dev-down.ps1
```

**Не используйте** `docker compose down -v`, если не хотите **полностью сбросить** базы в Docker.

### Что не трогать

- Локальный PostgreSQL 18 на Windows (служба `postgresql-x64-18`) — проект к нему не подключается, если в `.env` порт **5433**.
- Останавливать локальный Postgres **не обязательно** для OrderFlow.

---

## 6. Порты и URL (шпаргалка)

| Сервис | Порт | URL / назначение |
|--------|------|------------------|
| api-gateway | 3000 | **Главный API** для клиента |
| auth-service | 3001 | health, внутренний |
| order-service | 3002 | health, внутренний |
| inventory-service | 3003 | Go |
| payment-service | 3004 | Go |
| notification-service | 3005 | Go |
| PostgreSQL (Docker) | **5433** | `orderflow:orderflow@localhost:5433/...` |
| Redis | 6379 | rate limit на gateway |
| Kafka | 9092 | события саги |
| Kafka UI | 8080 | <http://localhost:8080> |
| RabbitMQ UI | 15672 | <http://localhost:15672> (`orderflow` / `orderflow`) |

Базы по сервисам:

| Сервис | База в URL |
|--------|------------|
| auth | `orderflow_auth` |
| order | `orderflow_order` |
| inventory | `orderflow_inventory` |
| payment | `orderflow_payment` |
| notification | `orderflow_notification` |

---

## 7. Проверка API (happy path)

Все запросы — на **gateway** `http://localhost:3000`.

### 7.1. Регистрация

`POST /api/v1/auth/register`

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

Пароль минимум 8 символов.

### 7.2. Вход

`POST /api/v1/auth/login` — скопировать **`accessToken`**.

### 7.3. Профиль (опционально)

`GET /api/v1/auth/me`
Header: `Authorization: Bearer <accessToken>`

### 7.4. Заказ

`POST /api/v1/orders`
Headers: `Content-Type: application/json`, `Authorization: Bearer <token>`

```json
{
  "currency": "USD",
  "items": [
    {
      "productId": "sku-1",
      "productName": "Demo Product",
      "quantity": 1,
      "unitPrice": 19.99
    }
  ]
}
```

Тестовый SKU `sku-1` — до 100 шт. в inventory.

### 7.5. Статус заказа

`GET /api/v1/orders`
`GET /api/v1/orders/<id>`

Ожидаемый путь статусов: `PENDING` → `PAYMENT_PENDING` → `CONFIRMED` (если все Go-сервисы и Kafka работают).

### 7.6. Kafka UI

<http://localhost:8080> → Topics → сообщения после создания заказа.

---

## 8. Observability (опционально)

Тяжёлые образы (Grafana, Prometheus, Jaeger). При медленном интернете первый `up` может падать по таймауту.

```powershell
cd backend\infra\compose
docker compose --profile observability up -d
```

| UI | URL |
|----|-----|
| Jaeger | <http://localhost:16686> |
| Grafana | <http://localhost:3100> |
| Prometheus | <http://localhost:9090> |

Подробнее: [observability.md](./observability.md) (runbook «один заказ → Jaeger»), [metrics.md](./metrics.md), [idempotency.md](./idempotency.md).

Для обычной проверки саги observability **не нужна**.

---

## 9. Конфликт порта 5432 (Windows)

**Симптом:** auth health 500, в логах `28P01`, «password authentication failed for user orderflow».

**Причина:** на `localhost:5432` отвечает **локальный** PostgreSQL, а не Docker.

**Решение в проекте:** Docker Postgres проброшен на **5433**. Проверьте во всех `.env`:

```env
DATABASE_URL=postgresql://orderflow:orderflow@localhost:5433/orderflow_auth
```

(имя базы меняется по сервису)

Проверка с хоста:

```powershell
cd backend\services\auth-service
node -e "const {Client}=require('pg');const c=new Client({connectionString:'postgresql://orderflow:orderflow@localhost:5433/orderflow_auth'});c.connect().then(()=>{console.log('OK');c.end()}).catch(e=>console.error(e.message))"
```

Должно вывести `OK`.

Останавливать службу `postgresql-x64-18` **не обязательно**, если везде порт 5433.

---

## 10. Частые проблемы

| Симптом | Вероятная причина | Что сделать |
|---------|-------------------|-------------|
| auth 500, `28P01` | порт 5432 вместо 5433 | исправить `DATABASE_URL`, перезапустить auth |
| gateway 502 / Bad Gateway | auth или order не запущены | поднять сервис, проверить URL в gateway `.env` |
| `exports is not defined` (Prisma) | старый dist / ESM | `npx prisma generate`, пересборка; в проекте уже `prisma-client-js` + adapter |
| `PrismaClientOptions` / adapter | Prisma 7 | в `PrismaService` должен быть `@prisma/adapter-pg` |
| заказ завис в PENDING | нет inventory/payment/kafka | запустить Go-сервисы, `docker compose ps`, Kafka UI |
| `npm install` долго | норма для первого раза | подождать или `npm install --prefer-offline` |
| Docker pull timeout (Grafana) | сеть | только `docker compose up -d` без profile observability |
| JWT invalid | разные секреты | выровнять `JWT_ACCESS_SECRET` в auth и gateway |
| EBADENGINE Node 22 | предупреждение Prisma | можно игнорировать на Node 20 или поставить Node 22 |

---

## 11. Скрипты в `backend/scripts/`

| Скрипт | Действие |
|--------|----------|
| `dev-up.ps1` | `docker compose up -d` в `backend/infra/compose` |
| `dev-down.ps1` | `docker compose down` (без удаления volumes) |
| `dev-ps.ps1` | статус контейнеров |
| `dev-check.ps1` | HTTP health auth + gateway |

Запуск из **корня репозитория**:

```powershell
.\backend\scripts\dev-up.ps1
```

---

## 12. Чеклист «всё готово к демо заказа»

- [ ] `docker compose ps` — postgres, redis, kafka, rabbitmq healthy
- [ ] В `.env` сервисов порт Postgres **5433**
- [ ] `auth` + `gateway` + `order` — `start:dev` без ошибок
- [ ] `inventory` + `payment` + `notification` — `go run ./cmd/server`
- [ ] `GET localhost:3001/health` — database up
- [ ] register + login через `:3000` — есть `accessToken`
- [ ] `POST /api/v1/orders` — 201/200 и id заказа
- [ ] Kafka UI — появились сообщения в топиках

### Фронтенд (браузер, фаза 1)

Отдельный терминал после backend:

```powershell
cd client
copy .env.example .env
pnpm install
pnpm dev
```

- [ ] Открыт **<http://localhost:4000>** (shell + remotes :4101, :4102)
- [ ] Регистрация / логин в UI
- [ ] «Создать заказ (sku-1)» → деталь заказа → статус **CONFIRMED** (polling ~2 с)

---

## 13. Краткая памятка (одна строка)

**Утро:** `dev-up` → нужные терминалы `start:dev` / `go run` → `cd client && pnpm dev`.
**Вечер:** Ctrl+C в терминалах → по желанию `dev-down`.
**API для UI:** `http://localhost:3000` (gateway). **Браузер:** `http://localhost:4000`.
