#!/bin/bash

# Docker Debug Wrapper Script
# This script runs the docker-debug.js script with the correct environment

# Set default profile if not provided
profile=${profile:-ci}

# Create logs directory if it doesn't exist
mkdir -p "logs"

# Create a debug directory with timestamp
timestamp=$(date +"%Y%m%d_%H%M%S")
debug_dir="logs/docker-debug-${profile}-${timestamp}"
mkdir -p "${debug_dir}"

echo "=== Starting Docker debug (profile: ${profile}) ==="
echo "Debug logs will be saved to: ${debug_dir}/"

# Run the debug script and capture output
NODE_OPTIONS="--no-warnings" node scripts/docker-debug.js --profile=${profile} | tee "${debug_dir}/debug.log"

# Copy any generated log files to the debug directory
for log_file in *.log; do
  if [ -f "$log_file" ]; then
    echo "Moving ${log_file} to ${debug_dir}/"
    mv "$log_file" "${debug_dir}/"
  fi
done

# Also copy existing debug report if it was created
if [ -d "docker-debug-report" ]; then
  cp -r docker-debug-report/* "${debug_dir}/" 2>/dev/null
  echo "Copied debug report to ${debug_dir}/"
fi

# Save timestamp for reference
date > "${debug_dir}/timestamp.txt"

# Create a symlink to the most recent debug logs
ln -sf "${debug_dir}" "logs/latest-debug"

echo "=== Debug complete ==="
echo "All logs have been saved to: ${debug_dir}/"
echo "Quick access available via: logs/latest-debug/" 