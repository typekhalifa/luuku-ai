#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL must be configured before starting Luuku API." >&2
  exit 1
fi

echo "[luuku] applying Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "[luuku] starting API..."
exec node dist/backend/shared/api/server.js
