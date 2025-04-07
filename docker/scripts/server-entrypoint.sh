#!/bin/bash
# Disable immediate exit to capture errors
set +e

# Function to log with timestamp
log() {
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1"
}

# Source environment variables if the temporary file exists
if [ -f "/tmp/env_vars.sh" ]; then
  log "Sourcing environment variables from .env.${NODE_ENV}"
  source /tmp/env_vars.sh
fi

# Log environment information
log "=== ENVIRONMENT SETUP ==="
log "Current directory: $(pwd)"
log "NODE_ENV: $NODE_ENV"
log "PORT: $PORT"
log "FRONTEND_URL: $FRONTEND_URL"
log "Database URL (masked): ${DATABASE_URL//:*@/:***@}"

# Check for critical environment variables
if [ -z "$PORT" ]; then
  log "ERROR: PORT environment variable is missing!"
fi

if [ -z "$FRONTEND_URL" ]; then
  log "ERROR: FRONTEND_URL environment variable is missing!"
fi

if [ -z "$NODE_ENV" ]; then
  log "WARNING: NODE_ENV is not set. This may affect .env file loading."
  # Set a default NODE_ENV if not provided
  NODE_ENV="test"
  log "Setting default NODE_ENV=$NODE_ENV"
fi

# Check if environment file exists
if [ -n "$NODE_ENV" ] && [ -f "env/.env.$NODE_ENV" ]; then
  log "Found env file: env/.env.$NODE_ENV"
  log "Contents of env/.env.$NODE_ENV (excluding sensitive data):"
  grep -v -E "PASSWORD|SECRET|KEY" "env/.env.$NODE_ENV" || log "Failed to read env file"
else
  log "WARNING: env/.env.$NODE_ENV file not found!"
  ls -la env/ || log "Failed to list env directory"
fi

# Check if server build exists
if [ -f "dist/server/index.js" ]; then
  log "Server build found at dist/server/index.js"
else
  log "ERROR: dist/server/index.js not found! Build is missing."
  ls -la dist/ 2>/dev/null || log "dist/ directory doesn't exist or is empty"
fi

# Generate Prisma client
log "=== GENERATING PRISMA CLIENT ==="
NODE_ENV=$NODE_ENV pnpm prisma:generate
GENERATE_EXIT_CODE=$?
if [ $GENERATE_EXIT_CODE -ne 0 ]; then
  log "ERROR: Prisma client generation failed with exit code $GENERATE_EXIT_CODE"
else
  log "Prisma client generated successfully"
fi

# Run database migrations
log "=== RUNNING DATABASE MIGRATIONS ==="
NODE_ENV=$NODE_ENV pnpm prisma:migrate
MIGRATE_EXIT_CODE=$?
if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
  log "ERROR: Database migrations failed with exit code $MIGRATE_EXIT_CODE"
else
  log "Database migrations completed successfully"
fi

log "=== RUNNING DATABASE SEED ==="
NODE_ENV=$NODE_ENV pnpm prisma:seed
SEED_EXIT_CODE=$?
if [ $SEED_EXIT_CODE -ne 0 ]; then
  log "ERROR: Database seed failed with exit code $SEED_EXIT_CODE"
else
  log "Database seed completed successfully"
fi

# Start the server with enhanced error logging
log "=== STARTING SERVER ==="
log "Command to run: $*"

# Run the server with NODE_ENV explicitly set
NODE_ENV=$NODE_ENV "$@" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  log "SERVER FAILED with exit code: $EXIT_CODE"
  log "Environment variables (excluding sensitive data):"
  env | grep -v -E "PASSWORD|SECRET|KEY" | sort
  
  # Try to run with trace warnings for more detailed error information
  log "=== ATTEMPTING TO RUN SERVER WITH TRACE WARNINGS ==="
  NODE_ENV=$NODE_ENV NODE_OPTIONS="--trace-warnings" "$@" 2>&1
  TRACE_EXIT_CODE=$?
  
  if [ $TRACE_EXIT_CODE -ne 0 ]; then
    log "SERVER FAILED with trace warnings with exit code: $TRACE_EXIT_CODE"
  fi
fi

exit $EXIT_CODE 