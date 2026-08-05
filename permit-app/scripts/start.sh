#!/bin/sh
# Production start script for hosted deploys (Render, Railway, Fly, a VPS, etc.).
# Prepares the persistent disk, applies the DB schema, seeds the demo data + admin
# login on first boot (idempotent), then starts the web server.
set -e

# Make sure the uploads/generated-files directory exists on the mounted disk.
mkdir -p "${STORAGE_DIR:-/app/storage}"

echo "Applying database schema..."
npx prisma db push --skip-generate

# Seed is idempotent — it only creates data that isn't there yet, so it's safe to run
# on every boot. On first boot it creates the admin login and sample data.
echo "Seeding (first boot only)..."
npm run db:seed || echo "Seed skipped or failed; continuing."

echo "Starting server on port ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}"
