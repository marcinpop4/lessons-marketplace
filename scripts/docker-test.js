#!/usr/bin/env node

/**
 * Docker Test Script
 * 
 * A unified script to run tests in Docker. This replaces multiple test scripts
 * with one that can handle different test types with clear output.
 * 
 * Usage: node scripts/docker-test.js [unit|e2e|all] [test-pattern]
 */

import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all'; // unit, e2e, or all
const testPattern = args[1] || process.env.TEST_PATTERN || '';

// ANSI color codes for better output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// Docker Compose command base
const DOCKER_COMPOSE_CMD = 'docker-compose -f docker/docker-compose.yml';

console.log(`${CYAN}==========================================${RESET}`);
console.log(`${CYAN}Docker Test Runner${RESET}`);
console.log(`${CYAN}Test Type: ${testType}${RESET}`);
if (testPattern) {
  console.log(`${CYAN}Test Pattern: ${testPattern}${RESET}`);
}
console.log(`${CYAN}==========================================${RESET}`);

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
  const cmd = `${DOCKER_COMPOSE_CMD} run --rm -e SKIP_WEB_SERVER=true -e MOCK_API=true tests npx playwright test ${patternArg} --reporter=line`;
  
  return runCommand(cmd, 'Running E2E tests');
}

/**
 * Clean up test containers
 */
function cleanupTestContainers() {
  return runCommand(`${DOCKER_COMPOSE_CMD} --profile test down`, 'Cleaning up test containers');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Set up environment
    if (!runCommand('pnpm env:docker', 'Setting up Docker environment')) {
      process.exit(1);
    }
    
    // Build the test container
    if (!buildTestContainer()) {
      process.exit(1);
    }
    
    let success = true;
    
    // Run the appropriate tests
    switch (testType.toLowerCase()) {
      case 'unit':
        success = runUnitTests();
        break;
      case 'e2e':
        success = runE2ETests();
        break;
      case 'all':
        success = runUnitTests();
        if (success) {
          success = runE2ETests();
        }
        break;
      default:
        console.error(`${RED}Unknown test type: ${testType}${RESET}`);
        console.log(`${YELLOW}Available options: unit, e2e, all${RESET}`);
        process.exit(1);
    }
    
    // Clean up containers regardless of test outcome
    cleanupTestContainers();
    
    if (success) {
      console.log(`${GREEN}All tests completed successfully!${RESET}`);
    } else {
      console.error(`${RED}Tests failed!${RESET}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${RED}Test execution failed${RESET}`, error);
    // Ensure cleanup even on error
    cleanupTestContainers();
    process.exit(1);
  }
}

// Start the main process
main(); 