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

# Create the app if it doesn't exist
if ! fly apps list | grep -q "lessons-marketplace-frontend"; then
    echo "Creating new fly app: lessons-marketplace-frontend"
    fly apps create lessons-marketplace-frontend
    
    # Create volume if needed
    fly volumes create frontend_data --region ams --size 1
fi

# Deploy the app
echo "Deploying frontend to fly.io..."
cd frontend
fly deploy --config fly.toml

echo "Frontend deployed successfully!"
echo "Visit: https://lessons-marketplace-frontend.fly.dev"

# Note about local development
echo ""
echo "For local development with Docker Compose, use:"
echo "docker compose up -d" 