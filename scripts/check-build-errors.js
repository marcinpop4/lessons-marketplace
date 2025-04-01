#!/usr/bin/env node

/**
 * This script simulates the Docker build environment
 * to catch TypeScript errors that might be missed during development
 * but show up in CI/CD pipelines.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set environment variable to match Docker build
process.env.ENV_TYPE = 'prod';

// Colors for output formatting
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Print banner
console.log(`${colors.cyan}=======================================${colors.reset}`);
console.log(`${colors.cyan}= TypeScript Error Check for Deployment =${colors.reset}`);
console.log(`${colors.cyan}=======================================${colors.reset}`);
console.log(`\nThis script checks for TypeScript errors that might only appear in the deployment environment.`);

// Run TypeScript with server config but don't emit files
console.log(`\n${colors.yellow}Running TypeScript check with server config...${colors.reset}`);
const serverCheck = spawnSync('npx', [
  'tsc',
  '--project', 'server/tsconfig.server.json',
  '--noEmit'
], { 
  stdio: 'inherit',
  shell: true
});

if (serverCheck.status !== 0) {
  console.log(`\n${colors.red}✖ Server TypeScript check failed with errors!${colors.reset}`);
  console.log(`\n${colors.yellow}These are the same errors you would see in the GitHub deployment.${colors.reset}`);
  console.log(`To fix them, please update your code to properly type all parameters and variables.`);
  process.exit(1);
}

console.log(`\n${colors.green}✓ Server TypeScript check passed successfully!${colors.reset}`);

// Run TypeScript with shared config but don't emit files
console.log(`\n${colors.yellow}Running TypeScript check with shared config...${colors.reset}`);
const sharedCheck = spawnSync('npx', [
  'tsc',
  '--project', 'shared/tsconfig.shared.json',
  '--noEmit'
], { 
  stdio: 'inherit',
  shell: true
});

if (sharedCheck.status !== 0) {
  console.log(`\n${colors.red}✖ Shared TypeScript check failed with errors!${colors.reset}`);
  process.exit(1);
}

console.log(`\n${colors.green}✓ Shared TypeScript check passed successfully!${colors.reset}`);

// Run TypeScript with frontend config but don't emit files
console.log(`\n${colors.yellow}Running TypeScript check with frontend config...${colors.reset}`);
const frontendCheck = spawnSync('npx', [
  'tsc',
  '--project', 'frontend/config/tsconfig.app.json',
  '--noEmit'
], { 
  stdio: 'inherit',
  shell: true
});

if (frontendCheck.status !== 0) {
  console.log(`\n${colors.red}✖ Frontend TypeScript check failed with errors!${colors.reset}`);
  process.exit(1);
}

console.log(`\n${colors.green}✓ Frontend TypeScript check passed successfully!${colors.reset}`);
console.log(`\n${colors.green}✓ All TypeScript checks passed! Your code should build without errors in the deployment environment.${colors.reset}`); 