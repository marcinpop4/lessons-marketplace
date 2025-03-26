#!/usr/bin/env node

/**
 * Docker Deployment Script
 * 
 * This script manages the deployment of all Docker services:
 * - Cleans existing containers
 * - Builds fresh images
 * - Starts all services
 * - Waits for server readiness
 * - Runs migrations and seeds the database
 */

import { execSync } from 'child_process';

// ANSI color codes for better output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// Base command for Docker Compose
const DOCKER_COMPOSE_CMD = 'docker compose -f docker/docker-compose.yml';

/**
 * Runs a command and prints the output
 */
function runCommand(command, description) {
  console.log(`${YELLOW}${description}...${RESET}`);
  console.log(`${CYAN}Running: ${command}${RESET}`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${RED}Failed: ${description}${RESET}`);
    return false;
  }
}

/**
 * Check if the server is running properly
 */
function isServerRunning() {
  try {
    // Use Docker's healthcheck status which is already working
    const output = execSync(`${DOCKER_COMPOSE_CMD} ps server`).toString();
    console.log(`${YELLOW}Server container status: ${output}${RESET}`);
    
    if (output.includes('healthy')) {
      console.log(`${GREEN}Server is reported healthy by Docker${RESET}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`${RED}Error checking server status: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Docker Deployment${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  // Step 1: Set up environment
  if (!runCommand('pnpm env:docker', 'Setting up Docker environment')) {
    process.exit(1);
  }
  
  // Step 2: Clean up existing containers
  runCommand(`${DOCKER_COMPOSE_CMD} down --remove-orphans`, 'Cleaning up existing containers');
  
  // Step 3: Build fresh images
  if (!runCommand(`${DOCKER_COMPOSE_CMD} build database server frontend`, 'Building Docker images')) {
    process.exit(1);
  }
  
  // Step 4: Start all services
  if (!runCommand(`${DOCKER_COMPOSE_CMD} up -d database server frontend`, 'Starting all services')) {
    process.exit(1);
  }
  
  // Step 5: Wait for server to be ready
  console.log(`${YELLOW}Waiting for server to be ready...${RESET}`);
  let serverReady = false;
  for (let i = 0; i < 10; i++) {
    if (isServerRunning()) {
      console.log(`${GREEN}Server is running!${RESET}`);
      serverReady = true;
      break;
    }
    console.log(`${YELLOW}Server not ready yet, waiting (${i + 1}/10)...${RESET}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  if (!serverReady) {
    console.error(`${RED}Server failed to start properly.${RESET}`);
    console.error(`${YELLOW}Try checking the logs with: ${DOCKER_COMPOSE_CMD} logs server${RESET}`);
    process.exit(1);
  }
  
  // Give a little extra time for server internals to initialize
  console.log(`${YELLOW}Server is running, waiting 5 seconds for initialization...${RESET}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 6: Run database migrations
  if (!runCommand(
    `${DOCKER_COMPOSE_CMD} exec server npx prisma migrate deploy --schema=server/prisma/schema.prisma`,
    'Running database migrations'
  )) {
    console.error(`${RED}Failed to run migrations. Attempting to continue...${RESET}`);
  }
  
  // Wait a bit after migrations
  console.log(`${YELLOW}Waiting for migrations to settle...${RESET}`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 7: Seed the database
  if (!runCommand(
    `${DOCKER_COMPOSE_CMD} exec server node dist/server/prisma/seed.js`,
    'Seeding the database'
  )) {
    process.exit(1);
  }
  
  console.log(`${GREEN}==========================================${RESET}`);
  console.log(`${GREEN}Deployment completed successfully!${RESET}`);
  console.log(`${GREEN}==========================================${RESET}`);
}

// Start the main process
main().catch(error => {
  console.error(`${RED}Deployment failed:${RESET}`, error);
  process.exit(1);
}); 