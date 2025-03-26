#!/usr/bin/env node

/**
 * Docker Management Script
 * 
 * A unified interface for Docker operations in the project.
 * This script handles both deployment and testing with clear output and error handling.
 * 
 * Usage:
 * - node scripts/docker-manager.js deploy     - Deploy all services
 * - node scripts/docker-manager.js test unit  - Run unit tests
 * - node scripts/docker-manager.js test e2e   - Run E2E tests
 * - node scripts/docker-manager.js test all   - Run all tests
 * - node scripts/docker-manager.js down       - Stop and remove all containers
 * - node scripts/docker-manager.js logs       - Show logs from all containers
 */

import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const subCommand = args[1] || '';
const testPattern = args[2] || process.env.TEST_PATTERN || '';

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
    // Use Docker's healthcheck status which is the most reliable indicator
    const output = execSync(`${DOCKER_COMPOSE_CMD} ps server`).toString();
    
    if (output.includes('healthy')) {
      console.log(`${GREEN}Server is reported healthy by Docker${RESET}`);
      return true;
    }
    
    // If not yet healthy, check if it's at least running
    if (output.includes('Up') && output.includes('server')) {
      console.log(`${YELLOW}Server container is up but not yet reported healthy${RESET}`);
    } else {
      console.log(`${YELLOW}Server container not found or not running${RESET}`);
    }
    
    return false;
  } catch (error) {
    console.error(`${RED}Error checking server status: ${error.message}${RESET}`);
    return false;
  }
}

/**
 * Deploy all services
 */
async function deploy() {
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
  
  // Step 4: Start database only
  if (!runCommand(`${DOCKER_COMPOSE_CMD} up -d database`, 'Starting database')) {
    process.exit(1);
  }
  
  // Step 5: Wait for database to be ready
  console.log(`${YELLOW}Waiting for database to be ready...${RESET}`);
  let dbReady = false;
  for (let i = 0; i < 10; i++) {
    try {
      const output = execSync(`${DOCKER_COMPOSE_CMD} ps database`).toString();
      if (output.includes('database') && output.includes('healthy')) {
        console.log(`${GREEN}Database is healthy!${RESET}`);
        dbReady = true;
        break;
      }
    } catch (error) {}
    
    console.log(`${YELLOW}Database not ready yet, waiting (${i + 1}/10)...${RESET}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  if (!dbReady) {
    console.error(`${RED}Database failed to start properly.${RESET}`);
    console.error(`${YELLOW}Try checking the logs with: ${DOCKER_COMPOSE_CMD} logs database${RESET}`);
    process.exit(1);
  }
  
  // Step 6: Run database migrations
  if (!runCommand(
    `${DOCKER_COMPOSE_CMD} run --rm server npx prisma migrate deploy --schema=server/prisma/schema.prisma`,
    'Running database migrations'
  )) {
    console.error(`${RED}Failed to run migrations.${RESET}`);
    process.exit(1);
  }
  
  // Step 7: Seed the database
  if (!runCommand(
    `${DOCKER_COMPOSE_CMD} run --rm server node dist/server/prisma/seed.js`,
    'Seeding the database'
  )) {
    console.error(`${RED}Failed to seed the database.${RESET}`);
    process.exit(1);
  }
  
  // Step 8: Start server
  if (!runCommand(`${DOCKER_COMPOSE_CMD} up -d server`, 'Starting server')) {
    process.exit(1);
  }
  
  // Step 9: Wait for server to be ready
  console.log(`${YELLOW}Waiting for server to be ready...${RESET}`);
  let serverReady = false;
  
  // Wait up to 30 seconds for the server to start (10 attempts * 3 seconds)
  for (let i = 0; i < 15; i++) {
    console.log(`${YELLOW}Checking server readiness (attempt ${i + 1}/15)...${RESET}`);
    
    if (isServerRunning()) {
      console.log(`${GREEN}Server is running!${RESET}`);
      serverReady = true;
      break;
    }
    
    console.log(`${YELLOW}Server not ready yet, waiting 3 seconds before next check...${RESET}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  if (!serverReady) {
    console.log(`${YELLOW}Server might be running but not detected by our checks.${RESET}`);
    console.log(`${YELLOW}Checking server logs for errors...${RESET}`);
    
    try {
      const logs = execSync(`${DOCKER_COMPOSE_CMD} logs server`).toString();
      if (logs.includes('Server running on port 3000') || logs.includes('[INFO] Server running')) {
        console.log(`${GREEN}Server appears to be running based on logs. Continuing deployment...${RESET}`);
        serverReady = true;
      } else if (logs.includes('Error:') || logs.includes('error:')) {
        console.error(`${RED}Server logs contain errors:${RESET}`);
        console.error(logs.split('\n').filter(line => line.includes('Error:') || line.includes('error:')).join('\n'));
      }
    } catch (error) {
      console.error(`${RED}Failed to check server logs: ${error.message}${RESET}`);
    }
  }
  
  // Even if detection failed, start frontend anyway if we're not sure
  if (!serverReady) {
    console.warn(`${YELLOW}WARNING: Server readiness could not be confirmed after multiple attempts.${RESET}`);
    console.warn(`${YELLOW}Check the logs with: ${DOCKER_COMPOSE_CMD} logs server${RESET}`);
    console.warn(`${YELLOW}Continuing with frontend deployment anyway...${RESET}`);
  }
  
  // Step 10: Start frontend
  if (!runCommand(`${DOCKER_COMPOSE_CMD} up -d frontend`, 'Starting frontend')) {
    console.error(`${RED}Failed to start frontend.${RESET}`);
    console.error(`${YELLOW}Try checking the logs with: ${DOCKER_COMPOSE_CMD} logs frontend${RESET}`);
  } else {
    console.log(`${GREEN}Frontend started successfully!${RESET}`);
  }
  
  console.log(`${GREEN}==========================================${RESET}`);
  console.log(`${GREEN}Deployment completed!${RESET}`);
  
  // Display status of all containers
  console.log(`${CYAN}Container Status:${RESET}`);
  runCommand(`${DOCKER_COMPOSE_CMD} ps`, 'Checking container status');
  
  console.log(`${GREEN}==========================================${RESET}`);
  console.log(`${YELLOW}To view logs:${RESET}`);
  console.log(`${CYAN}Database: ${DOCKER_COMPOSE_CMD} logs database${RESET}`);
  console.log(`${CYAN}Server:   ${DOCKER_COMPOSE_CMD} logs server${RESET}`);
  console.log(`${CYAN}Frontend: ${DOCKER_COMPOSE_CMD} logs frontend${RESET}`);
  console.log(`${GREEN}==========================================${RESET}`);
}

/**
 * Build the test container
 */
function buildTestContainer() {
  return runCommand(`${DOCKER_COMPOSE_CMD} --profile test build tests`, 'Building test container');
}

/**
 * Run unit tests
 */
function runUnitTests() {
  console.log(`${CYAN}Running Unit Tests${RESET}`);
  
  const patternArg = testPattern ? `-- -t "${testPattern}"` : '';
  const cmd = `${DOCKER_COMPOSE_CMD} run --rm tests npx jest tests/unit --verbose ${patternArg}`;
  
  return runCommand(cmd, 'Running unit tests');
}

/**
 * Run E2E tests
 */
function runE2ETests() {
  console.log(`${CYAN}Running E2E Tests${RESET}`);
  
  const patternArg = testPattern ? `--grep "${testPattern}"` : '';
  const cmd = `${DOCKER_COMPOSE_CMD} run --rm tests npx playwright test ${patternArg} --reporter=list --retries=0`;
  
  return runCommand(cmd, 'Running E2E tests');
}

/**
 * Clean up test containers
 */
function cleanupTestContainers() {
  return runCommand(`${DOCKER_COMPOSE_CMD} --profile test down`, 'Cleaning up test containers');
}

/**
 * Run database query and log results
 */
function debugDatabaseContents() {
  console.log(`${CYAN}Debugging Database Contents${RESET}`);
  console.log(`${YELLOW}Checking seeded data in the database...${RESET}`);
  
  // Check students
  console.log(`${YELLOW}Checking students data:${RESET}`);
  const studentsResult = runCommand(
    `${DOCKER_COMPOSE_CMD} exec -T database psql -U marcin -d lessons_marketplace -c "SELECT COUNT(*) FROM \\\"Student\\\""`,
    'Counting students in database'
  );
  
  // Get sample student data
  runCommand(
    `${DOCKER_COMPOSE_CMD} exec -T database psql -U marcin -d lessons_marketplace -c "SELECT id, email, \\\"firstName\\\", \\\"lastName\\\" FROM \\\"Student\\\" LIMIT 3"`,
    'Sample student data'
  );
  
  // Check teachers
  console.log(`${YELLOW}Checking teachers data:${RESET}`);
  const teachersResult = runCommand(
    `${DOCKER_COMPOSE_CMD} exec -T database psql -U marcin -d lessons_marketplace -c "SELECT COUNT(*) FROM \\\"Teacher\\\""`,
    'Counting teachers in database'
  );
  
  // Get sample teacher data
  runCommand(
    `${DOCKER_COMPOSE_CMD} exec -T database psql -U marcin -d lessons_marketplace -c "SELECT id, email, \\\"firstName\\\", \\\"lastName\\\" FROM \\\"Teacher\\\" LIMIT 3"`,
    'Sample teacher data'
  );
  
  // Check lesson requests
  console.log(`${YELLOW}Checking lesson requests data:${RESET}`);
  const lessonRequestsResult = runCommand(
    `${DOCKER_COMPOSE_CMD} exec -T database psql -U marcin -d lessons_marketplace -c "SELECT COUNT(*) FROM \\\"LessonRequest\\\""`,
    'Counting lesson requests in database'
  );
  
  console.log(`${GREEN}Database check completed${RESET}`);
  return studentsResult && teachersResult && lessonRequestsResult;
}

/**
 * Check test environment variables for debugging
 */
function checkTestEnvironment() {
  console.log(`${YELLOW}Checking test environment variables:${RESET}`);
  runCommand(`${DOCKER_COMPOSE_CMD} run --rm tests env | grep -E 'FRONTEND|PLAYWRIGHT|SKIP|MOCK'`, 'Environment variables');
  console.log(`${YELLOW}Test container access check to frontend:${RESET}`);
  runCommand(`${DOCKER_COMPOSE_CMD} run --rm tests curl -s -I http://frontend:80 | head -n 1`, 'Frontend access check');
  return true;
}

/**
 * Run the full test suite with deployment, unit tests, and e2e tests
 */
async function runFullTestSuite() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Running Full Test Suite${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  // Step 1: Deploy the application
  console.log(`${YELLOW}Step 1: Deploying the application${RESET}`);
  await deploy();
  
  // Step 2: Test with the deployed application
  return runTestsWithDeployedApp();
}

/**
 * Run tests with an already deployed application
 */
async function runTestsWithDeployedApp() {
  // Build the test container
  if (!buildTestContainer()) {
    console.error(`${RED}Failed to build test container${RESET}`);
    return false;
  }
  
  // Debug: Check test environment
  console.log(`${YELLOW}Checking test environment${RESET}`);
  checkTestEnvironment();
  
  // Debug: Check database contents before running tests
  console.log(`${YELLOW}Verifying database contents before tests${RESET}`);
  if (!debugDatabaseContents()) {
    console.error(`${RED}Database check failed. Tests may not have correct seed data.${RESET}`);
    // Continue anyway for now, but flag the issue
    console.log(`${YELLOW}Continuing with tests despite database check issues...${RESET}`);
  }
  
  // Step 1: Run unit tests
  console.log(`${YELLOW}Step 1: Running unit tests${RESET}`);
  if (!runUnitTests()) {
    console.error(`${RED}Unit tests failed. Stopping test suite.${RESET}`);
    return false;
  }
  
  // Step 2: Run E2E tests
  console.log(`${YELLOW}Step 2: Running E2E tests${RESET}`);
  if (!runE2ETests()) {
    console.error(`${RED}E2E tests failed.${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Test suite completed successfully!${RESET}`);
  return true;
}

/**
 * Run tests
 */
async function runTests() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Docker Test Runner${RESET}`);
  console.log(`${CYAN}Test Type: ${subCommand || 'all'}${RESET}`);
  if (testPattern) {
    console.log(`${CYAN}Test Pattern: ${testPattern}${RESET}`);
  }
  console.log(`${CYAN}==========================================${RESET}`);
  
  // Set up environment
  if (!runCommand('pnpm env:docker', 'Setting up Docker environment')) {
    process.exit(1);
  }
  
  // Build the test container
  if (!buildTestContainer()) {
    process.exit(1);
  }
  
  let success = true;
  let skipCleanup = false;
  
  // Run the appropriate tests
  switch (subCommand.toLowerCase()) {
    case 'unit':
      success = runUnitTests();
      break;
    case 'e2e':
      success = runE2ETests();
      break;
    case 'all':
    case '':
      success = await runFullTestSuite();
      break;
    case 'with-deploy':
      success = await runFullTestSuite();
      break;
    case 'no-deploy':
      success = await runTestsWithDeployedApp();
      skipCleanup = true; // Skip cleanup for debugging
      break;
    default:
      console.error(`${RED}Unknown test type: ${subCommand}${RESET}`);
      console.log(`${YELLOW}Available options: unit, e2e, all, with-deploy, no-deploy${RESET}`);
      process.exit(1);
  }
  
  // Clean up containers only if not skipped
  if (!skipCleanup) {
    cleanupTestContainers();
  } else {
    console.log(`${YELLOW}Skipping container cleanup for debugging${RESET}`);
  }
  
  if (success) {
    console.log(`${GREEN}All tests completed successfully!${RESET}`);
  } else {
    console.error(`${RED}Tests failed!${RESET}`);
    process.exit(1);
  }
}

/**
 * Stop and remove all containers
 */
function downContainers() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Stopping and removing Docker containers${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  try {
    console.log(`${YELLOW}Attempting to stop containers with Docker Compose...${RESET}`);
    execSync(`${DOCKER_COMPOSE_CMD} down --remove-orphans`, { stdio: 'inherit' });
    
    // Verify if containers are actually down
    const runningContainers = execSync('docker ps -a | grep lessons-marketplace').toString();
    
    if (runningContainers && runningContainers.includes('lessons-marketplace')) {
      console.log(`${YELLOW}Some containers are still running. Using direct Docker commands...${RESET}`);
      
      // Force stop containers by name
      console.log(`${YELLOW}Stopping containers by name...${RESET}`);
      execSync('docker stop lessons-marketplace-frontend lessons-marketplace-server lessons-marketplace-db lessons-marketplace-tests 2>/dev/null || true', { stdio: 'inherit' });
      
      // Force remove containers by name
      console.log(`${YELLOW}Removing containers by name...${RESET}`);
      execSync('docker rm lessons-marketplace-frontend lessons-marketplace-server lessons-marketplace-db lessons-marketplace-tests 2>/dev/null || true', { stdio: 'inherit' });
    }
    
    console.log(`${GREEN}All containers stopped and removed successfully!${RESET}`);
    return true;
  } catch (error) {
    console.error(`${RED}Error stopping containers: ${error.message}${RESET}`);
    console.log(`${YELLOW}Attempting alternative cleanup method...${RESET}`);
    
    try {
      // Force stop containers by name as fallback
      execSync('docker stop lessons-marketplace-frontend lessons-marketplace-server lessons-marketplace-db lessons-marketplace-tests 2>/dev/null || true', { stdio: 'inherit' });
      execSync('docker rm lessons-marketplace-frontend lessons-marketplace-server lessons-marketplace-db lessons-marketplace-tests 2>/dev/null || true', { stdio: 'inherit' });
      console.log(`${GREEN}Cleanup completed with alternative method.${RESET}`);
      return true;
    } catch (fallbackError) {
      console.error(`${RED}Failed to clean up containers: ${fallbackError.message}${RESET}`);
      return false;
    }
  }
}

/**
 * Show logs from all containers
 */
function showLogs() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Docker Logs${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  if (!runCommand(`${DOCKER_COMPOSE_CMD} logs ${subCommand}`, 'Showing logs')) {
    process.exit(1);
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Docker Manager Help${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`
Usage: node scripts/docker-manager.js <command> [subcommand] [options]

Commands:
  deploy            Deploy all services
  test [type]       Run tests (unit, e2e, all, with-deploy, no-deploy)
  down              Stop and remove all containers
  logs [service]    Show logs from containers
  migrate           Run database migrations
  seed              Seed the database
  debug-db          Check database contents without running tests
  help              Show this help message

Examples:
  node scripts/docker-manager.js deploy
  node scripts/docker-manager.js test unit
  node scripts/docker-manager.js test e2e
  node scripts/docker-manager.js test no-deploy
  node scripts/docker-manager.js logs server
  node scripts/docker-manager.js migrate
  node scripts/docker-manager.js seed
  node scripts/docker-manager.js debug-db
  `);
}

/**
 * Run database migrations
 */
function runMigrations() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Running Database Migrations${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  // Set up environment
  if (!runCommand('pnpm env:docker', 'Setting up Docker environment')) {
    process.exit(1);
  }
  
  // Run migrations
  if (!runCommand(
    `${DOCKER_COMPOSE_CMD} exec server npx prisma migrate deploy --schema=server/prisma/schema.prisma`,
    'Running database migrations'
  )) {
    console.error(`${RED}Failed to run migrations.${RESET}`);
    process.exit(1);
  }
  
  console.log(`${GREEN}Migrations completed successfully!${RESET}`);
}

/**
 * Seed the database
 */
function seedDatabase() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Seeding Database${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  // Set up environment
  if (!runCommand('pnpm env:docker', 'Setting up Docker environment')) {
    process.exit(1);
  }
  
  // Seed database
  if (!runCommand(
    `${DOCKER_COMPOSE_CMD} exec server node dist/server/prisma/seed.js`,
    'Seeding the database'
  )) {
    console.error(`${RED}Failed to seed the database.${RESET}`);
    process.exit(1);
  }
  
  console.log(`${GREEN}Database seeded successfully!${RESET}`);
}

/**
 * Just check database contents for debugging
 */
function checkDatabaseOnly() {
  console.log(`${CYAN}==========================================${RESET}`);
  console.log(`${CYAN}Database Content Check${RESET}`);
  console.log(`${CYAN}==========================================${RESET}`);
  
  debugDatabaseContents();
  
  console.log(`${GREEN}Database check completed${RESET}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    switch (command.toLowerCase()) {
      case 'deploy':
        await deploy();
        break;
      case 'test':
        await runTests();
        break;
      case 'down':
        downContainers();
        break;
      case 'logs':
        showLogs();
        break;
      case 'migrate':
        runMigrations();
        break;
      case 'seed':
        seedDatabase();
        break;
      case 'debug-db':
        checkDatabaseOnly();
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`${RED}Error: ${error.message}${RESET}`);
    process.exit(1);
  }
}

// Start the main process
main(); 