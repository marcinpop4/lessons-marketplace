#!/bin/bash

# Docker Debug Script
# This script automates debugging of Docker environments by running a debug script
# and ensuring logs are captured correctly for analysis.

set -e
echo "Starting Docker debug process..."

# Get profile name from environment or use ci as default
profileName=${profile:-ci}
echo "Using profile: $profileName"

# Define the debug directory with timestamp to prevent overwriting
timestamp=$(date +%Y%m%d_%H%M%S)
debug_dir="logs/docker-debug-${profileName}-${timestamp}"

# Create the logs directory first
mkdir -p "logs" || true
chmod -R 777 "logs" || true

# Create debug directory with timestamp
mkdir -p "${debug_dir}" || true
chmod -R 777 "${debug_dir}" || true

# Define Docker Compose command
COMPOSE_CMD="docker compose"

# Run the debug script with the profile environment variable
echo "Running Docker debug script for profile: ${profileName}"
NODE_OPTIONS="--no-warnings" node scripts/docker-debug.js || true

# Save logs to the debug directory
echo "Saving logs to ${debug_dir}"

# Move log files from logs directory to debug directory
for logfile in container-debug.log server-container-debug.log db-container-debug.log; do
  if [ -f "logs/$logfile" ]; then
    cp "logs/$logfile" "${debug_dir}/" || true
    echo "Saved logs/$logfile to ${debug_dir}"
  else
    echo "Warning: logs/$logfile not found"
  fi
done

# Save timestamp
echo "Debug completed at: $(date)" > "${debug_dir}/timestamp.txt" || true

# Create symlink to latest debug directory
ln -sf "${debug_dir}" "logs/latest-docker-debug" || true

echo "Docker debug process completed. Logs saved to ${debug_dir}" 