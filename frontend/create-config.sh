#!/bin/sh

# Create the runtime configuration using environment variables
echo "window.API_CONFIG = { BASE_URL: \"${VITE_API_BASE_URL}/api\" };" > /usr/share/nginx/html/config.js

echo "Created config.js with API_BASE_URL: ${VITE_API_BASE_URL}/api" 