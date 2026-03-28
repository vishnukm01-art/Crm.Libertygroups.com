#!/bin/sh
set -e

if [ "$SERVICE_MODE" = "worker" ]; then
  echo "[entrypoint] Starting in WORKER mode..."
  exec npx tsx src/workers/index.ts
else
  echo "[entrypoint] Starting in WEB mode..."
  exec node server.js
fi
