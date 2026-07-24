#!/usr/bin/env bash
# CI smoke: auth + gateway register → login → me
# Expects postgres (:5433) and redis (:6379) already up.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH_DIR="$ROOT/services/auth-service"
GW_DIR="$ROOT/services/api-gateway"

cp "$AUTH_DIR/.env.example" "$AUTH_DIR/.env"
cp "$GW_DIR/.env.example" "$GW_DIR/.env"

# Avoid Redis flakiness in smoke — JWT + proxy still exercised
sed -i 's/^THROTTLE_STORAGE=.*/THROTTLE_STORAGE=memory/' "$GW_DIR/.env"

(
  cd "$AUTH_DIR"
  npm ci
  npx prisma migrate deploy
  npm run build
  test -f dist/main.js
)

(
  cd "$GW_DIR"
  npm ci
  npm run build
  test -f dist/main.js
)

(cd "$AUTH_DIR" && node dist/main.js > /tmp/auth.log 2>&1) &
AUTH_PID=$!
(cd "$GW_DIR" && node dist/main.js > /tmp/gateway.log 2>&1) &
GW_PID=$!

cleanup() {
  kill "$AUTH_PID" "$GW_PID" 2>/dev/null || true
  # keep logs for artifact upload from workspace
  cp -f /tmp/auth.log "$ROOT/../auth-smoke.log" 2>/dev/null || true
  cp -f /tmp/gateway.log "$ROOT/../gateway-smoke.log" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:3001/health" >/dev/null; then
    echo "auth healthy"
    break
  fi
  if ! kill -0 "$AUTH_PID" 2>/dev/null; then
    echo "auth-service exited early"
    cat /tmp/auth.log || true
    exit 1
  fi
  if [ "$i" -eq 60 ]; then
    echo "auth health timeout"
    cat /tmp/auth.log || true
    exit 1
  fi
  sleep 2
done

for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:3000/health" >/dev/null; then
    echo "gateway healthy"
    break
  fi
  if ! kill -0 "$GW_PID" 2>/dev/null; then
    echo "api-gateway exited early"
    cat /tmp/gateway.log || true
    exit 1
  fi
  if [ "$i" -eq 60 ]; then
    echo "gateway health timeout"
    cat /tmp/gateway.log || true
    exit 1
  fi
  sleep 2
done

EMAIL="ci-$(date +%s)@example.com"
PASS='password123'

curl -sf -X POST "http://127.0.0.1:3000/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  -o /tmp/register.json

curl -sf -X POST "http://127.0.0.1:3000/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  -o /tmp/login.json

TOKEN="$(node -e "const j=require('/tmp/login.json'); if(!j.accessToken) process.exit(1); process.stdout.write(j.accessToken)")"

curl -sf "http://127.0.0.1:3000/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/me.json

node -e "const m=require('/tmp/me.json'); if(!m.email) process.exit(1); console.log('OK me', m.email)"
