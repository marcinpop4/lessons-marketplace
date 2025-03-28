#!/bin/bash

# Docker Cleanup Script
# This script ensures that all Docker resources related to our project are properly cleaned up
# before starting a new deployment to prevent conflicts

set -e
echo "Starting Docker cleanup process..."

# Get profile name from environment or use ci as default
profileName=${profile:-ci}
echo "Cleaning up Docker resources for profile: $profileName"

# Stop and remove any containers with our project name
echo "Stopping and removing containers..."
docker ps -a -q --filter "name=lessons-marketplace" | xargs -r docker rm -f || true

# Remove all volumes associated with our project
echo "Removing project volumes..."
docker volume ls -q --filter "name=lessons-marketplace" | xargs -r docker volume rm -f || true
docker volume rm -f postgres_data lessons-marketplace_postgres_data || true

# Remove any dangling images
echo "Cleaning up dangling images..."
docker image prune -f || true

# Clean up unused volumes
echo "Cleaning up unused volumes..."
docker volume prune -f || true

# Clean up unused networks
echo "Cleaning up unused networks..."
docker network prune -f || true

# Prune the Docker system
echo "Pruning Docker system..."
docker system prune -af --volumes || true

echo "Docker cleanup completed successfully!" 