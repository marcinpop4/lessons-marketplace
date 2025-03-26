#!/usr/bin/env tsx
/**
 * Update Docker Test Scripts
 * 
 * This script updates the package.json with improved Docker test scripts
 * that use Docker Compose profiles for selective service activation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load package.json
const packageJsonPath = path.resolve(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Docker test scripts
const dockerTestScripts = {
  // Setup common Docker environment with test profile
  "docker:test:env": "pnpm env:docker && docker compose -f docker/docker-compose.yml --profile test build",
  
  // Run unit tests in Docker
  "docker:test:unit": "pnpm docker:test:env && docker compose -f docker/docker-compose.yml --profile test up -d database server && docker compose -f docker/docker-compose.yml run --rm tests node scripts/docker-test-runner.js unit || (docker compose -f docker/docker-compose.yml logs server && docker compose -f docker/docker-compose.yml --profile test down && exit 1)",
  
  // Run E2E tests in Docker
  "docker:test:e2e": "pnpm docker:test:env && docker compose -f docker/docker-compose.yml --profile test up -d && docker compose -f docker/docker-compose.yml run --rm tests node scripts/docker-test-runner.js e2e || (docker compose -f docker/docker-compose.yml logs server && docker compose -f docker/docker-compose.yml --profile test down && exit 1)",
  
  // Run all tests in Docker
  "docker:test:all": "pnpm docker:test:env && docker compose -f docker/docker-compose.yml --profile test up -d && docker compose -f docker/docker-compose.yml run --rm tests node scripts/docker-test-runner.js all || (docker compose -f docker/docker-compose.yml logs server && docker compose -f docker/docker-compose.yml --profile test down && exit 1)",
  
  // Run tests with pattern matching
  "docker:test:pattern": "pnpm docker:test:env && docker compose -f docker/docker-compose.yml --profile test up -d && docker compose -f docker/docker-compose.yml run --rm -e TEST_PATTERN=\"$PATTERN\" tests node scripts/docker-test-runner.js all || (docker compose -f docker/docker-compose.yml logs server && docker compose -f docker/docker-compose.yml --profile test down && exit 1)",
  
  // Clean up test containers
  "docker:test:clean": "docker compose -f docker/docker-compose.yml --profile test down",
  
  // Main test command that runs all tests
  "docker:test:full": "pnpm docker:test:all && pnpm docker:test:clean",
  
  // Diagnostic commands for troubleshooting
  "docker:logs:server": "docker compose -f docker/docker-compose.yml logs server",
  "docker:logs:tests": "docker compose -f docker/docker-compose.yml logs tests",
  "docker:logs:all": "docker compose -f docker/docker-compose.yml logs",
};

// Update the scripts section
packageJson.scripts = {
  ...packageJson.scripts,
  ...dockerTestScripts,
};

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json with Docker test scripts');
console.log('\nNew Docker test commands:');
console.log('- pnpm docker:test:unit       - Run unit tests in Docker');
console.log('- pnpm docker:test:e2e        - Run E2E tests in Docker');
console.log('- pnpm docker:test:all        - Run all tests in Docker');
console.log('- pnpm docker:test:full       - Run all tests and clean up');
console.log('- pnpm docker:test:pattern    - Run tests matching a pattern (set PATTERN env var)');
console.log('- pnpm docker:test:clean      - Clean up test containers');
console.log('- pnpm docker:logs:server     - View server logs');
console.log('- pnpm docker:logs:tests      - View tests logs');
console.log('- pnpm docker:logs:all        - View all logs');
console.log('\nExample of running with pattern:');
console.log('PATTERN="login" pnpm docker:test:pattern'); 