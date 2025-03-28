#!/bin/bash

# Debug script for Docker networking and URL issues

echo "===================== DOCKER DNS INFO ====================="
echo "Checking hostname resolution for 'frontend' service..."
ping -c 3 frontend || echo "Cannot ping frontend"

echo "===================== HOST ENTRIES ====================="
cat /etc/hosts

echo "===================== NETWORK CONFIG ====================="
ip addr

echo "===================== DNS RESOLUTION ====================="
getent hosts frontend || echo "Cannot resolve frontend"

echo "===================== HTTP CONNECTION TEST ====================="
echo "Testing connection to frontend service..."
curl -v http://frontend/ || echo "Cannot connect to frontend service"

echo "===================== ENVIRONMENT VARIABLES ====================="
echo "DOCKER_FRONTEND_URL: $DOCKER_FRONTEND_URL"
echo "FRONTEND_URL: $FRONTEND_URL"
echo "TEST_ENV: $TEST_ENV"

echo "===================== URL TEST ====================="
URL="${DOCKER_FRONTEND_URL}/login"
echo "Testing URL: $URL"
curl -v "$URL" || echo "Cannot connect to $URL"

echo "===================== DOCKER NETWORK LIST ====================="
docker network ls || echo "Cannot list Docker networks"

echo "===================== FRONTEND CONTAINER INFO ====================="
docker inspect lessons-marketplace-frontend || echo "Cannot inspect frontend container" 