#!/bin/bash

# Test Alloy Configuration Validation Script
# This script starts the observability stack and runs integration tests
# to validate that Alloy is correctly processing and forwarding logs to Loki

set -e

# Configuration
NODE_ENV=${NODE_ENV:-development}
DOCKER_COMPOSE_FILE="docker/docker-compose.yml"
TEST_TIMEOUT=${TEST_TIMEOUT:-120}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Starting Alloy Configuration Validation Test${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans || true
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Step 1: Start observability stack with structured logging enabled
echo -e "\n${BLUE}📊 Starting observability stack...${NC}"
STRUCTURED_LOGS=true dotenv -e env/.env.${NODE_ENV} -- docker compose -f ${DOCKER_COMPOSE_FILE} up -d loki alloy grafana server

# Wait for services to be healthy
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
timeout ${TEST_TIMEOUT} bash -c '
    while ! docker compose -f '"${DOCKER_COMPOSE_FILE}"' ps | grep -E "(loki|alloy|grafana|server)" | grep -q "healthy"; do
        echo "Waiting for services to become healthy..."
        sleep 5
    done
    echo "All services are healthy!"
'

# Step 2: Run the Alloy validation tests
echo -e "\n${GREEN}🧪 Running Alloy validation tests...${NC}"
STRUCTURED_LOGS=true \
LOKI_URL=http://localhost:3100 \
ALLOY_URL=http://localhost:9080 \
SERVER_URL=http://localhost:3000 \
npx jest --config tests/integration/jest.config.js --testNamePattern="Alloy" --verbose

# Check test results
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ All Alloy validation tests passed!${NC}"
    echo -e "${GREEN}🎉 Your Alloy configuration is correctly processing logs${NC}"
else
    echo -e "\n${RED}❌ Alloy validation tests failed${NC}"
    echo -e "${RED}Please check the test output above for details${NC}"
    exit 1
fi

# Step 3: Optional: Show some example queries
echo -e "\n${BLUE}📋 Example Loki queries to explore your logs:${NC}"
echo -e "${YELLOW}HTTP Logs:${NC} {job=\"http-logs\"}"
echo -e "${YELLOW}Client Logs:${NC} {job=\"client-logs\"}"
echo -e "${YELLOW}Error Logs:${NC} {job=\"error-logs\"}"
echo -e "${YELLOW}DevOps Logs:${NC} {job=\"devops-logs\"}"
echo -e "\n${BLUE}🌐 Access Grafana at: http://localhost:3001 (admin/admin123)${NC}"
echo -e "${BLUE}🔍 Access Alloy UI at: http://localhost:9080${NC}"

# Ask if user wants to keep services running
echo -e "\n${YELLOW}Keep observability stack running for manual exploration? (y/N):${NC}"
read -r -n 1 response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}✨ Services will continue running. Use 'docker compose -f ${DOCKER_COMPOSE_FILE} down' to stop them.${NC}"
else
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans
fi

echo -e "\n${GREEN}🎯 Alloy validation complete!${NC}" 