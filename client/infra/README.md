# Client static deploy (nginx)

Production-like сборка: **shell** + remotes **mfe-auth** / **mfe-orders** на одном origin (Module Federation).

## Docker (рекомендуется)

Backend (gateway :3000) должен быть запущен на хосте.

```powershell
cd client\infra\compose
docker compose up --build
```

Открыть: **http://localhost:8080**

Сборка вшивает `VITE_API_URL=http://localhost:3000` — браузер на хосте ходит в gateway напрямую.

## Локальная сборка без Docker

```powershell
cd client
.\scripts\build-static.ps1
# раздача dist вручную или через любой static server + nginx.conf
```

## Переменные сборки

| Переменная | Dev | Static / Docker |
|------------|-----|-----------------|
| `VITE_API_URL` | `http://localhost:3000` | то же (gateway на хосте) |
| `VITE_MFE_AUTH_URL` | `http://localhost:4101/assets/remoteEntry.js` | `/mfe-auth/assets/remoteEntry.js` |
| `VITE_MFE_ORDERS_URL` | `http://localhost:4102/assets/remoteEntry.js` | `/mfe-orders/assets/remoteEntry.js` |
| `VITE_BASE_PATH` | `/` | `/mfe-auth/` или `/mfe-orders/` для remotes |
