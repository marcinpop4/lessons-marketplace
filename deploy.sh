#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment process...${NC}"

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

# Deploy API
echo -e "${YELLOW}Deploying API to fly.io...${NC}"
cd server
flyctl deploy --remote-only
if [ $? -ne 0 ]; then
  echo -e "${RED}API deployment failed. Please check the logs above.${NC}"
  exit 1
fi
echo -e "${GREEN}API deployed successfully!${NC}"
cd ..

# Deploy Frontend
echo -e "${YELLOW}Deploying Frontend to fly.io...${NC}"
cd frontend
flyctl deploy --remote-only
if [ $? -ne 0 ]; then
  echo -e "${RED}Frontend deployment failed. Please check the logs above.${NC}"
  exit 1
fi
echo -e "${GREEN}Frontend deployed successfully!${NC}"
cd ..

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "API URL: https://lessons-marketplace-dawn-cherry-4121.fly.dev"
echo -e "Frontend URL: https://lessons-marketplace-frontend.fly.dev"
echo -e "${YELLOW}Note: It may take a few minutes for the changes to propagate.${NC}" 