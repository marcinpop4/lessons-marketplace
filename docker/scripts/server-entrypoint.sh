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

# Start the server with enhanced error logging
echo "Starting server..."
# Set -e is temporarily disabled to capture errors
set +e
"$@" 2>&1
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "Server failed with exit code: $EXIT_CODE"
  echo "Environment variables:"
  # Print all environment variables (excluding sensitive ones)
  env | grep -v -E "PASSWORD|SECRET|KEY" | sort
  echo "Checking for npm debug logs:"
  cat /app/npm-debug.log 2>/dev/null || echo "No npm debug log found"
  echo "Checking for pnpm debug logs:"
  cat /app/.pnpm-debug.log 2>/dev/null || echo "No pnpm debug log found"
  echo "Checking Node.js version:"
  node --version
  echo "Checking server directory contents:"
  ls -la /app/dist/server
fi
# Exit with the original exit code
exit $EXIT_CODE 