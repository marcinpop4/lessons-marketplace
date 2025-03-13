#!/bin/sh
set -e

# Function to check if PostgreSQL is ready
wait_for_postgres() {
  echo "Waiting for PostgreSQL to be ready..."
  
  # Use the database host and port from the DATABASE_URL environment variable
  # For docker-compose, the host should be 'db'
  pg_isready -h db -p 5432
  
  # Keep checking until PostgreSQL is ready
  until [ $? -eq 0 ]; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
    pg_isready -h db -p 5432
  done
  
  echo "PostgreSQL is up and running!"
}

# Wait for the database to be ready
wait_for_postgres

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