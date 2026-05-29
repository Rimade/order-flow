# Production-like static host: shell + Module Federation remotes behind nginx
FROM node:22-alpine AS build

WORKDIR /src

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

# Remotes with subpath base (same origin as shell)
ENV VITE_BASE_PATH=/mfe-auth/
RUN pnpm --filter @orderflow/mfe-auth exec vite build

ENV VITE_BASE_PATH=/mfe-orders/
RUN pnpm --filter @orderflow/mfe-orders exec vite build

ENV VITE_BASE_PATH=
ENV VITE_MFE_AUTH_URL=/mfe-auth/assets/remoteEntry.js
ENV VITE_MFE_ORDERS_URL=/mfe-orders/assets/remoteEntry.js
RUN pnpm --filter @orderflow/shell exec vite build

FROM nginx:1.27-alpine

COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/shell/dist /usr/share/nginx/html
COPY --from=build /src/apps/mfe-auth/dist /usr/share/nginx/html/mfe-auth
COPY --from=build /src/apps/mfe-orders/dist /usr/share/nginx/html/mfe-orders

EXPOSE 80
