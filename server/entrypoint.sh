#!/bin/sh
set -e

# Function to check if PostgreSQL is ready
wait_for_postgres() {
  echo "Waiting for PostgreSQL to be ready..."
  
  # Use environment variables for database connection
  echo "Using database connection: host=$DB_HOST, port=$DB_PORT"
  
  # Keep checking until PostgreSQL is ready
  until pg_isready -h $DB_HOST -p $DB_PORT; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
  done
  
  echo "PostgreSQL is up and running!"
}

# Wait for the database to be ready
wait_for_postgres

# Build and set the DATABASE_URL environment variable
build_database_url() {
  # Check if required variables are set
  if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Error: Missing required database configuration. Please set DB_HOST, DB_PORT, DB_NAME, and DB_USER environment variables."
    exit 1
  fi
  
  # Build the URL
  SSL_PARAM=""
  if [ "$DB_SSL" = "true" ]; then
    SSL_PARAM="?sslmode=require"
  fi
  
  PASSWORD_PART=""
  if [ -n "$DB_PASSWORD" ]; then
    PASSWORD_PART=":$DB_PASSWORD"
  fi
  
  DATABASE_URL="postgresql://$DB_USER$PASSWORD_PART@$DB_HOST:$DB_PORT/$DB_NAME$SSL_PARAM"
  
  # Mask password for logging
  if [ -n "$DB_PASSWORD" ]; then
    MASKED_URL=$(echo $DATABASE_URL | sed "s/$DB_PASSWORD/******/")
    echo "Built DATABASE_URL from environment variables: $MASKED_URL"
  else
    echo "Built DATABASE_URL from environment variables: $DATABASE_URL"
  fi
  
  # Export the DATABASE_URL for Prisma to use
  export DATABASE_URL
}

# Build and export the DATABASE_URL
build_database_url

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy --schema=server/prisma/schema.prisma

# Generate Prisma client (in case it's needed)
echo "Generating Prisma client..."
npx prisma generate --schema=server/prisma/schema.prisma

# Debug information
echo "Listing server/dist directory:"
ls -la server/dist
echo "Listing server/dist/server directory:"
ls -la server/dist/server || echo "server/dist/server does not exist"

# Start the server
echo "Starting server..."
node server/dist/server/index.js 