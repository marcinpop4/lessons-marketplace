#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting database deployment process...${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if flyctl is installed
if ! command_exists flyctl; then
  echo -e "${RED}Error: flyctl is not installed. Please install it first:${NC}"
  echo "curl -L https://fly.io/install.sh | sh"
  exit 1
fi

# Check if user is logged in to fly.io
echo -e "${YELLOW}Checking fly.io authentication...${NC}"
if ! flyctl auth whoami &>/dev/null; then
  echo -e "${RED}Error: You are not logged in to fly.io. Please login first:${NC}"
  echo "flyctl auth login"
  exit 1
fi

# Create a PostgreSQL database on fly.io
echo -e "${YELLOW}Creating PostgreSQL database on fly.io...${NC}"
flyctl postgres create --name fly-lessons-marketplace-db --region ams --vm-size shared-cpu-1x --initial-cluster-size 1

# Get the database connection details
echo -e "${YELLOW}Getting database connection details...${NC}"
DB_URL=$(flyctl postgres connect --app fly-lessons-marketplace-db --print-connection-string)

# Extract database connection details
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Set database connection details as secrets in the API app
echo -e "${YELLOW}Setting database connection details as secrets in the API app...${NC}"
flyctl secrets set --app lessons-marketplace-dawn-cherry-4121 \
  DB_HOST=$DB_HOST \
  DB_PORT=$DB_PORT \
  DB_NAME=$DB_NAME \
  DB_USER=$DB_USER \
  DB_PASSWORD=$DB_PASSWORD \
  DB_SSL=true

echo -e "${GREEN}Database deployment completed successfully!${NC}"
echo -e "Database URL: $DB_HOST:$DB_PORT/$DB_NAME"
echo -e "${YELLOW}Note: The database connection details have been set as secrets in the API app.${NC}" 