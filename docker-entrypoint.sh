#!/bin/sh
set -e

echo "[entrypoint] Running Prisma db push..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "[entrypoint] WARNING: prisma db push failed, continuing..."

if [ "$SERVICE_MODE" = "worker" ]; then
  echo "[entrypoint] Starting in WORKER mode..."
  exec npx tsx src/workers/index.ts
else
  echo "[entrypoint] Starting in WEB mode..."
  exec node server.js
fi
