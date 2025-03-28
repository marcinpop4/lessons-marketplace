#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."
pnpm prisma:migrate

# Run seeds if SEED_DB environment variable is set to true
if [ "$SEED_DB" = "true" ]; then
  echo "Seeding database..."
  pnpm prisma:seed
fi

# Start the server
echo "Starting server..."
exec "$@" 