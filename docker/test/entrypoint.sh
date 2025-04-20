#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting Docker Test Sequence (NODE_ENV=$NODE_ENV) ---"

# Dependencies (db, server, frontend) are assumed healthy via docker-compose depends_on

echo "\n---> [Step 1/7] Running Unit Tests..."
pnpm test:unit

echo "\n---> [Step 2/7] Resetting Database..."
# Note: prisma:reset uses dotenv internally, but relies on NODE_ENV already being set in the container
pnpm prisma:reset --force

echo "\n---> [Step 3/7] Seeding Database..."
# Note: prisma:seed uses dotenv internally, but relies on NODE_ENV already being set in the container
pnpm prisma:seed

echo "\n---> [Step 4/7] Running API Tests..."
# Running raw jest command, assumes server is reachable via Docker network
# _test:api:jest loads env via its setup file, relying on NODE_ENV
pnpm run test:api

echo "\n---> [Step 5/7] Resetting Database (again)..."
pnpm prisma:reset --force

echo "\n---> [Step 6/7] Seeding Database (again)..."
pnpm prisma:seed

echo "\n---> [Step 7/7] Running E2E Tests..."
# Running Playwright command, assumes frontend is reachable via Docker network
# Assumes NODE_ENV=test (or appropriate) is already set in the container env
# Playwright config uses NODE_ENV to load its env vars
pnpm test:e2e

echo "\n--- Docker Test Sequence Complete ---" 