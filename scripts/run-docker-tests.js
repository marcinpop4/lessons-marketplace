#!/usr/bin/env node

/**
 * Run Tests in Docker
 * 
 * A simple script to run tests in Docker containers.
 * Usage: node scripts/run-docker-tests.js [unit|e2e|all] [test-pattern]
 */

import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const testPattern = args[1] || '';

// Colors for terminal output
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Print header
console.log(`${CYAN}==========================================${RESET}`);
console.log(`${CYAN}Running ${testType} tests in Docker${RESET}`);
if (testPattern) {
  console.log(`${CYAN}Test Pattern: ${testPattern}${RESET}`);
}
console.log(`${CYAN}==========================================${RESET}`);

try {
  // Set up the environment variables
  const envVars = testPattern 
    ? `TEST_PATTERN="${testPattern}"` 
    : '';

  // Build and start the containers with the test profile
  console.log(`${YELLOW}Starting Docker containers...${RESET}`);
  execSync(`cd docker && docker compose --profile test up -d`, {
    stdio: 'inherit'
  });

  // Run the tests in the test container
  console.log(`${YELLOW}Running tests in Docker...${RESET}`);
  execSync(`cd docker && docker compose exec tests node scripts/docker-test-runner.js ${testType} ${testPattern}`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      TEST_PATTERN: testPattern
    }
  });

  console.log(`${GREEN}Tests completed successfully!${RESET}`);
} catch (error) {
  console.error(`${RED}Error running tests in Docker: ${error.message}${RESET}`);
  process.exit(1);
} finally {
  // Clean up containers
  console.log(`${YELLOW}Cleaning up Docker containers...${RESET}`);
  try {
    execSync(`cd docker && docker compose --profile test down`, {
      stdio: 'inherit'
    });
  } catch (cleanupError) {
    console.error(`${RED}Error during cleanup: ${cleanupError.message}${RESET}`);
  }
} 