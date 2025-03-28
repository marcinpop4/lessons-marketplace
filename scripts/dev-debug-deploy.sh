#!/bin/bash
# Development Debug and Deploy Script
# This script automates the debugging and deployment process for the lessons-marketplace app

# Set default profile to dev if not specified
profile=${1:-dev}
timestamp=$(date +"%Y%m%d_%H%M%S")
logs_dir="logs"
log_dir="${logs_dir}/debug-deploy-${profile}-${timestamp}"

echo "=== Starting Debug & Deploy Process (profile: ${profile}) ==="
echo "Logs will be saved to: ${log_dir}/"
mkdir -p "${log_dir}"

# Step 1: Clean up existing containers and logs
echo "=== Cleaning up environment ==="
docker ps -a | grep "lessons-marketplace" | awk '{print $1}' | xargs -r docker stop
docker ps -a | grep "lessons-marketplace" | awk '{print $1}' | xargs -r docker rm
rm -rf ${logs_dir}/docker-debug-report/* 2>/dev/null
mkdir -p ${logs_dir}/docker-debug-report

# Step 2: Run the deployment rebuild
echo "=== Running deployment rebuild ==="
export profile="${profile}"
npm run docker:deploy:rebuild | tee "${log_dir}/deploy.log"

# Step 3: Run the debug script to capture state
echo "=== Running debug script ==="
export profile="${profile}"
./scripts/debug-docker.sh | tee "${log_dir}/debug.log"

# Step 4: Copy any root-level log files to the log directory
echo "=== Collecting additional logs ==="
find . -maxdepth 1 -name "*.log" -type f -exec cp {} "${log_dir}/" \;

# Create a symlink to the most recent logs
ln -sf "${log_dir}" "${logs_dir}/latest"

echo "=== Process completed ==="
echo "All logs have been saved to: ${log_dir}/"
echo "Quick access available via: ${logs_dir}/latest/" 