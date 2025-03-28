#!/bin/bash
# Disable immediate exit to capture errors
set +e

# Function to log with timestamp
log() {
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1"
}

# Log environment information
log "=== ENVIRONMENT SETUP ==="
log "Current directory: $(pwd)"
log "ENV_TYPE: $ENV_TYPE"
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

if [ -z "$ENV_TYPE" ]; then
  log "WARNING: ENV_TYPE is not set. This may affect .env file loading."
fi

# Check if environment file exists
if [ -n "$ENV_TYPE" ] && [ -f "env/.env.$ENV_TYPE" ]; then
  log "Found env file: env/.env.$ENV_TYPE"
  log "Contents of env/.env.$ENV_TYPE (excluding sensitive data):"
  grep -v -E "PASSWORD|SECRET|KEY" "env/.env.$ENV_TYPE" || log "Failed to read env file"
else
  log "WARNING: env/.env.$ENV_TYPE file not found!"
  ls -la env/ || log "Failed to list env directory"
fi

# Check if server build exists
if [ -f "dist/server/index.js" ]; then
  log "Server build found at dist/server/index.js"
else
  log "ERROR: dist/server/index.js not found! Build is missing."
  ls -la dist/ 2>/dev/null || log "dist/ directory doesn't exist or is empty"
fi

# Run database migrations
log "=== RUNNING DATABASE MIGRATIONS ==="
pnpm prisma:migrate
MIGRATE_EXIT_CODE=$?
if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
  log "ERROR: Database migrations failed with exit code $MIGRATE_EXIT_CODE"
else
  log "Database migrations completed successfully"
fi

# Run seeds if SEED_DB environment variable is set to true
if [ "$SEED_DB" = "true" ]; then
  log "=== RUNNING DATABASE SEED ==="
  pnpm prisma:seed
  SEED_EXIT_CODE=$?
  if [ $SEED_EXIT_CODE -ne 0 ]; then
    log "ERROR: Database seed failed with exit code $SEED_EXIT_CODE"
  else
    log "Database seed completed successfully"
  fi
fi

# Start the server with enhanced error logging
log "=== STARTING SERVER ==="
log "Command to run: $*"

# Run the server
"$@" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  log "SERVER FAILED with exit code: $EXIT_CODE"
  log "Environment variables (excluding sensitive data):"
  env | grep -v -E "PASSWORD|SECRET|KEY" | sort
  
  # Check if npm-debug.log exists
  if [ -f "/app/npm-debug.log" ]; then
    log "=== NPM DEBUG LOG ==="
    cat /app/npm-debug.log
  fi
  
  # Check if pnpm-debug.log exists
  if [ -f "/app/.pnpm-debug.log" ]; then
    log "=== PNPM DEBUG LOG ==="
    cat /app/.pnpm-debug.log
  fi
  
  # Check Node.js version
  log "Node.js version: $(node --version)"
  
  # Try running node with --trace-warnings to get more detailed error information
  log "=== ATTEMPTING TO RUN SERVER WITH TRACE WARNINGS ==="
  NODE_OPTIONS="--trace-warnings" node dist/server/index.js 2>&1 || log "Failed to run with trace warnings"
fi

# Exit with the original exit code
exit $EXIT_CODE 