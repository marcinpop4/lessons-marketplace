#!/bin/bash
set -e

# Verify environment variables are available
if [ -z "$POSTGRES_USER" ]; then
  echo "ERROR: POSTGRES_USER environment variable is not set"
  exit 1
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "ERROR: POSTGRES_PASSWORD environment variable is not set"
  exit 1
fi

if [ -z "$POSTGRES_DB" ]; then
  echo "ERROR: POSTGRES_DB environment variable is not set"
  exit 1
fi

echo "Starting database initialization:"
echo "  Database: $POSTGRES_DB"
echo "  User: $POSTGRES_USER"

# When the PostgreSQL docker image initializes, it creates a default user 
# with the name specified in POSTGRES_USER who has superuser privileges.
# We connect to the default 'postgres' database for administrative tasks

# Create database if it doesn't exist - it's usually created by the container,
# but we verify it exists
psql -U "$POSTGRES_USER" -d $POSTGRES_DB -v ON_ERROR_STOP=1 <<-EOSQL
    -- Create database if it doesn't exist
    SELECT 'CREATE DATABASE $POSTGRES_DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB');
    
    -- Grant privileges to the user
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL

echo "Database initialization completed successfully."
echo "Database $POSTGRES_DB is now ready with user $POSTGRES_USER." 