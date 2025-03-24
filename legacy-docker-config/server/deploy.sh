#!/bin/bash
set -e

# Navigate to the project root
cd "$(dirname "$0")/.."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "Error: fly CLI is not installed. Please install it first."
    echo "Visit https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if logged in to fly
if ! fly auth whoami &> /dev/null; then
    echo "You are not logged in to fly.io. Please login first."
    fly auth login
fi

# Deploy the app
echo "Deploying backend API to fly.io..."
cd server
fly deploy --config fly.toml

echo "Backend API deployed successfully!"
echo "Visit: https://lessons-marketplace-dawn-cherry-4121.fly.dev"

# Note about local development
echo ""
echo "For local development with Docker Compose, use:"
echo "docker compose up -d" 