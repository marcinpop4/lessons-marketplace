#!/usr/bin/env tsx

/**
 * Docker Test Script
 * 
 * This script runs tests against an existing Docker deployment.
 * It's designed to be a lightweight alternative to docker:test:full
 * that doesn't rebuild everything from scratch.
 * 
 * Usage:
 *   pnpm docker:test                   - Run all tests
 *   pnpm docker:test login.spec.ts     - Run specific test file
 *   pnpm docker:test -- --grep "login" - Run tests matching pattern
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the root directory (now two levels up since we're in docker/scripts)
const rootDir = join(__dirname, '../..');
const envPath = join(rootDir, '.env');

// Process command line arguments
// Skip the first two args (node executable and script path)
const args = process.argv.slice(2);

// Check if help was requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Docker Test Script
------------------
This script runs Playwright tests against an existing Docker deployment.

Usage:
  pnpm docker:test                      - Run all tests
  pnpm docker:test login.spec.ts        - Run a specific test file
  pnpm docker:test -- --grep "login"    - Run tests matching a pattern
  pnpm docker:test -- -h                - Show Playwright help

Related commands:
  pnpm docker:test:setup                - Setup Docker containers without running tests
  pnpm docker:test:full                 - Run full process: setup containers and run all tests
  pnpm docker:test:pattern "login"      - Run full process but only test patterns matching "login"

Notes:
  - This requires Docker containers to be running already
  - Make sure FRONTEND_URL is set in your .env file
  `);
  process.exit(0);
}

// Load environment variables
console.log('Loading environment variables from .env...');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  console.error('Please create this file with the required environment variables.');
  process.exit(1);
}

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading environment variables:', result.error.message);
  process.exit(1);
}

// Define paths
const composeFile = join(rootDir, 'docker', 'docker-compose.yml');

// Function to execute shell commands with proper NODE_OPTIONS handling
function execute(command: string, options: { cwd?: string; env?: Record<string, string> } = {}): void {
  try {
    console.log(`Executing: ${command}`);
    
    // Create a copy of the environment
    const env = { ...process.env, ...options.env };
    
    // Remove NODE_OPTIONS to avoid issues with --no-experimental-fetch
    delete env.NODE_OPTIONS;
    
    execSync(command, { 
      stdio: 'inherit', 
      cwd: options.cwd || rootDir,
      env
    });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

// Check if Docker containers are running
function checkContainersRunning(): boolean {
  try {
    // First try without --format json to see if containers are running
    const checkCmd = `docker compose --env-file .env -f ${composeFile} ps`;
    const result = execSync(checkCmd, { 
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '' }
    }).toString();
    
    // Count the containers based on the output lines
    const lines = result.split('\n').filter(line => line.trim());
    
    // The output usually has a header line, so we expect at least 4 lines for 3 containers
    // Alternatively, check for specific container names
    const hasDb = result.includes('lessons-marketplace-db');
    const hasServer = result.includes('lessons-marketplace-server');
    const hasFrontend = result.includes('lessons-marketplace-frontend');
    
    const containersRunning = hasDb && hasServer && hasFrontend;
    
    if (containersRunning) {
      console.log('Docker containers are running.');
      return true;
    } else {
      console.log('Some required Docker containers are not running.');
      return false;
    }
  } catch (error) {
    console.error('Error checking if containers are running:', error);
    return false;
  }
}

// Function to run the tests
function runTests(): void {
  console.log('Running end-to-end tests against existing Docker deployment...');
  
  // Ensure FRONTEND_URL exists and has protocol
  if (!process.env.FRONTEND_URL) {
    console.error('Error: FRONTEND_URL environment variable is not set.');
    console.error('Please set this variable in your .env file.');
    process.exit(1);
  }
  
  let frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl.startsWith('http')) {
    frontendUrl = `http://${frontendUrl}`;
  }
  
  console.log(`Using FRONTEND_URL: ${frontendUrl}`);
  
  // Build the Playwright command with any provided args
  let playwrightArgs = '';
  if (args.length > 0) {
    // If the first arg is a .ts file but doesn't start with dash, assume it's a test file
    if (args[0].endsWith('.ts') && !args[0].startsWith('-')) {
      // Check if the file exists in the tests directory
      const testFile = args[0];
      const testPath = join(rootDir, 'tests', testFile);
      const alternateTestPath = join(rootDir, 'tests', 'e2e', testFile);
      
      if (fs.existsSync(testPath)) {
        playwrightArgs = testPath;
      } else if (fs.existsSync(alternateTestPath)) {
        playwrightArgs = alternateTestPath;
      } else {
        console.log(`Test file ${testFile} not found directly, passing to Playwright as-is`);
        playwrightArgs = testFile;
      }
    } else {
      // Pass all args directly to playwright
      playwrightArgs = args.join(' ');
    }
  }
  
  // Run the Playwright tests
  try {
    const command = `SKIP_WEB_SERVER=true PLAYWRIGHT_TIMEOUT=10000 PLAYWRIGHT_ACTION_TIMEOUT=10000 PLAYWRIGHT_NAVIGATION_TIMEOUT=10000 FRONTEND_URL="${frontendUrl}" npx playwright test ${playwrightArgs}`;
    execute(command);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
  
  console.log('End-to-end tests completed successfully!');
}

// Main execution flow
console.log('Starting Docker test...');

// Check if Docker containers are running
if (!checkContainersRunning()) {
  console.error('Error: Docker containers are not running.');
  console.error('Please run pnpm docker:deploy first, or use pnpm docker:test:full to deploy and test in one step.');
  process.exit(1);
}

// Run the tests
runTests();

console.log('Docker test completed successfully!'); 