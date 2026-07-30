# Kubernetes (учебный слой)

Опциональный локальный деплой app-сервисов в **kind**.
**Повседневная разработка** по-прежнему: Docker Compose (infra) + apps на host — см. [local-dev-routine.md](./local-dev-routine.md).

```text
Compose (Postgres/Redis/Kafka/Rabbit)  ←── host.docker.internal
                                          ↑
kind cluster ── Deployments (gateway, auth, order, …)
     └── NodePort 30000 → host :3000 (api-gateway)
```

## Когда использовать

| Режим | Что запускать |
|-------|----------------|
| Daily learning / hot reload | Compose + `npm`/`go run` на host |
| Учить Deployments / Services / ConfigMap | kind + этот каталог |
| Прод / cloud / Helm / mesh | **не цель** этого репо |

## Prerequisites

- Docker Desktop
- [kind](https://kind.sigs.k8s.io/) + `kubectl`
- Compose infra уже up (`backend/infra/compose`)

Kafka из подов: поднимите bridge-listener (иначе advertised `localhost:9092` ломает клиентов в кластере):

```powershell
cd backend\infra\compose
docker compose -f docker-compose.yml -f docker-compose.k8s-bridge.yml up -d
```

## Быстрый старт

```powershell
# 1) Кластер
kind create cluster --config backend\infra\k8s\kind-config.yaml

# 2) Образы (контекст сборки = backend/)
.\backend\scripts\build-images.ps1
.\backend\scripts\kind-load-images.ps1

# 3a) Smoke: только gateway + auth
.\backend\scripts\k8s-apply-smoke.ps1

# 3b) Все app-сервисы
kubectl apply -k backend\infra\k8s

kubectl -n orderflow get pods,svc
curl http://localhost:3000/health
```

Удалить:

```powershell
kubectl delete -k backend\infra\k8s
kind delete cluster --name orderflow
```

## Структура

| Путь | Назначение |
|------|------------|
| [infra/k8s/kind-config.yaml](../infra/k8s/kind-config.yaml) | kind: NodePort 30000 → host 3000 |
| [infra/k8s/base/](../infra/k8s/base/) | Namespace, ConfigMap, Secret |
| [infra/k8s/apps/](../infra/k8s/apps/) | Deployment + Service на сервис |
| [infra/k8s/overlays/smoke/](../infra/k8s/overlays/smoke/) | gateway + auth |
| [infra/compose/docker-compose.k8s-bridge.yml](../infra/compose/docker-compose.k8s-bridge.yml) | Kafka `:9094` для подов |

Образы: `orderflow/<service>:local` — Dockerfile в каждом `backend/services/*/Dockerfile` (build context = `backend/`).

## Сеть к Compose

ConfigMap/Secret используют `host.docker.internal` (Docker Desktop + kind).
In-cluster URL’ы gateway → `http://auth-service:3001` и т.д.

## Ограничения (намеренно)

- Нет Helm / operators / Ingress controller (достаточно NodePort).
- Нет Postgres/Kafka внутри кластера.
- Client (shell MFE) в K8s не входит в этот инкремент.
- Secret с учебными паролями — только для локалки.

## Dockerfile’ы

```powershell
cd backend
docker build -f services/api-gateway/Dockerfile -t orderflow/api-gateway:local .
# … или .\scripts\build-images.ps1
```

Nest (auth/order/catalog): entrypoint делает `prisma migrate deploy`, затем `node dist/main`.
Go: SQL migrations читаются из `/app/migrations` при старте.
