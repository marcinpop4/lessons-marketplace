#!/bin/bash

# wait-for-db.sh
# Script to ensure database is ready before starting server

set -e

# Get variables from environment or use defaults
DB_HOST="${DB_HOST:-database-ci}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-marcin}"
DB_NAME="${POSTGRES_DB:-lessons_marketplace}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for PostgreSQL to be ready at ${DB_HOST}:${DB_PORT}..."

# Initialize retry counter
count=0

# Keep checking until database responds or max retries reached
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1 || [ $count -eq $MAX_RETRIES ]; do
  echo "PostgreSQL is unavailable - sleeping (${count}/${MAX_RETRIES})"
  sleep ${RETRY_INTERVAL}
  count=$((count+1))
done

# If we've reached max retries, exit with failure
if [ $count -eq $MAX_RETRIES ]; then
  echo "Error: Couldn't connect to PostgreSQL after ${MAX_RETRIES} attempts!"
  echo "Connection details:"
  echo "  Host: ${DB_HOST}"
  echo "  Port: ${DB_PORT}"
  echo "  User: ${DB_USER}"
  echo "  Database: ${DB_NAME}"
  exit 1
fi

echo "PostgreSQL is up and running at ${DB_HOST}:${DB_PORT}!"

# Verify database connection with a query
echo "Verifying database connection with a simple query..."
if ! PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" > /dev/null 2>&1; then
  echo "Error: Could connect to PostgreSQL server but query failed!"
  exit 1
fi

echo "Database connection verified successfully."

# Run the command passed to the script
echo "Executing provided command: $@"
exec "$@" 