#!/usr/bin/env node
/**
 * Docker Test Runner
 * 
 * Runs tests in the Docker container environment.
 * This script is the main entry point for all test execution in Docker.
 */

import { execSync } from 'child_process';
import http from 'http';

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all'; // unit, e2e, or all
const testPattern = args[1] || '';

// ANSI color codes for better output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

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
function runCommand(command: string): void {
  try {
    console.log(`${YELLOW}Running: ${command}${RESET}`);
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`${RED}Test execution failed${RESET}`);
    process.exit(1);
  }
}

/**
 * Check if the server is ready by making an HTTP request to the health endpoint
 */
function checkServerHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`${YELLOW}Checking server health...${RESET}`);
    
    const options = {
      hostname: 'server',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`${GREEN}Server is healthy: ${data}${RESET}`);
          resolve(true);
        } else {
          console.error(`${RED}Server returned status code: ${res.statusCode}${RESET}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`${RED}Error checking server health: ${error.message}${RESET}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error(`${RED}Timeout checking server health${RESET}`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Wait for server to be ready with retries
 */
async function waitForServer(retries = 5, interval = 5000): Promise<void> {
  console.log(`${YELLOW}Waiting for server to be ready...${RESET}`);
  
  for (let i = 0; i < retries; i++) {
    const isHealthy = await checkServerHealth();
    
    if (isHealthy) {
      return;
    }
    
    console.log(`${YELLOW}Server not ready yet, retrying in ${interval / 1000} seconds (${i + 1}/${retries})${RESET}`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  console.error(`${RED}Server did not become ready after ${retries} attempts${RESET}`);
  process.exit(1);
}

/**
 * Fix esbuild platform mismatch issue by installing the correct platform version
 */
function fixEsbuild(): void {
  console.log(`${YELLOW}Setting up esbuild for the current platform...${RESET}`);
  
  try {
    // Remove the existing esbuild
    runCommand('npm uninstall -g esbuild');
    runCommand('npm uninstall esbuild');
    
    // Install esbuild for the current platform
    runCommand('npm install -g esbuild');
    runCommand('npm install esbuild');
    
    console.log(`${GREEN}esbuild installed successfully for the current platform${RESET}`);
  } catch (error) {
    console.error(`${RED}Failed to setup esbuild: ${error}${RESET}`);
    process.exit(1);
  }
}

/**
 * Run unit tests
 */
function runUnitTests(): void {
  console.log(`${CYAN}Running Unit Tests${RESET}`);
  const patternArg = testPattern ? `-- -t "${testPattern}"` : '';
  runCommand(`node scripts/run-tests.js tests/unit ${patternArg}`);
}

/**
 * Run E2E tests
 */
function runE2ETests(): void {
  console.log(`${CYAN}Running E2E Tests${RESET}`);
  const patternArg = testPattern ? `--grep "${testPattern}"` : '';
  
  // Ensure Playwright browsers are installed
  runCommand('npx playwright install --with-deps chromium');
  
  // Run the tests with the Docker-specific configuration
  runCommand(`SKIP_WEB_SERVER=true npx playwright test ${patternArg} --reporter=list`);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Fix esbuild platform mismatch
    fixEsbuild();
    
    // Ensure the server is ready before running tests
    await waitForServer();
    
    // Run the appropriate tests
    switch (testType.toLowerCase()) {
      case 'unit':
        runUnitTests();
        break;
      case 'e2e':
        runE2ETests();
        break;
      case 'all':
        runUnitTests();
        runE2ETests();
        break;
      default:
        console.error(`${RED}Unknown test type: ${testType}${RESET}`);
        console.log(`${YELLOW}Available options: unit, e2e, all${RESET}`);
        process.exit(1);
    }

    console.log(`${GREEN}All tests completed successfully!${RESET}`);
  } catch (error) {
    console.error(`${RED}Test execution failed${RESET}`, error);
    process.exit(1);
  }
}

// Start the main process
main(); 