#!/bin/bash

# Docker Cleanup Script
# This script ensures a COMPLETE clean slate by removing ALL Docker resources
# Use with caution as it removes ALL containers, volumes, networks, and images

echo "🧹 Starting deep Docker cleanup..."

# Stop all running containers
echo "Stopping all running containers..."
docker stop $(docker ps -a -q) 2>/dev/null || true

# Remove all containers
echo "Removing all containers..."
docker rm -f $(docker ps -a -q) 2>/dev/null || true

# Remove all volumes (THIS IS IMPORTANT - THIS REMOVES ALL DATABASE DATA)
echo "Removing all Docker volumes (including database data)..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Remove all unused networks
echo "Removing all Docker networks..."
docker network prune -f

# Remove unused images (optional, but ensures fresh builds)
echo "Removing all Docker images..."
docker rmi -f $(docker images -a -q) 2>/dev/null || true

# Remove build cache (ensures completely fresh builds)
echo "Removing Docker build cache..."
docker builder prune -af

# Final system prune to catch anything left
echo "Performing final system prune..."
docker system prune -af --volumes

echo "✅ Docker deep clean completed!"
echo "All containers, volumes, networks, and images have been removed."
echo "Next docker deploy will start completely fresh with no persistent data." 