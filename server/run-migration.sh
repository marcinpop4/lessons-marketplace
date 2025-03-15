#!/bin/bash
set -e

# Load environment variables from .env file
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
else
  echo "Error: .env file not found in parent directory"
  exit 1
fi

# Build the DATABASE_URL from individual environment variables
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

export DATABASE_URL="postgresql://$DB_USER$PASSWORD_PART@$DB_HOST:$DB_PORT/$DB_NAME$SSL_PARAM"

# Mask password for logging
if [ -n "$DB_PASSWORD" ]; then
  MASKED_URL=$(echo $DATABASE_URL | sed "s/$DB_PASSWORD/******/")
  echo "Built DATABASE_URL from environment variables: $MASKED_URL"
else
  echo "Built DATABASE_URL from environment variables: $DATABASE_URL"
fi

# Run the Prisma migration
npx prisma migrate dev --name add_address_model 