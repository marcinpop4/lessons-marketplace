#!/bin/bash

# Debug script to show what build args are being passed
echo "=== Environment Variables ==="
echo "NODE_VERSION=${NODE_VERSION}"
echo "PNPM_VERSION=${PNPM_VERSION}"
echo "NODE_ENV=${NODE_ENV}"

echo ""
echo "=== Docker Compose Build Args ==="
echo "About to run: docker compose -f docker/docker-compose.yml --profile test build test --no-cache"

# Run the actual build command
exec docker compose -f docker/docker-compose.yml --profile test build test --no-cache 