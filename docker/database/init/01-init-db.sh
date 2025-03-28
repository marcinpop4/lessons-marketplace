#!/bin/bash
set -e

# Create database user and set password
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE USER marcin WITH PASSWORD 'password';
  ALTER USER marcin WITH SUPERUSER;
  CREATE DATABASE lessons_marketplace;
  GRANT ALL PRIVILEGES ON DATABASE lessons_marketplace TO marcin;
EOSQL

echo "Database initialization completed successfully." 