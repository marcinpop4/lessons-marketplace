#!/usr/bin/env node
// @ts-check
/**
 * Test Runner Script (ESM version)
 * 
 * This script runs tests using Jest in ESM mode.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const testDir = args[0] || 'tests';
const verbose = args.includes('--verbose');
const testPattern = args.indexOf('--') > -1 ? 
  args.slice(args.indexOf('--') + 1).join(' ') : '';

// ANSI color codes for better output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${CYAN}==========================================${RESET}`);
console.log(`${CYAN}Test Runner (ESM version)${RESET}`);
console.log(`${CYAN}Test Directory: ${testDir}${RESET}`);
if (testPattern) {
  console.log(`${CYAN}Test Pattern: ${testPattern}${RESET}`);
}
if (verbose) {
  console.log(`${CYAN}Verbose mode: enabled${RESET}`);
}
console.log(`${CYAN}==========================================${RESET}`);

/**
 * Runs a command and prints the output
 */
function runCommand(command) {
  try {
    console.log(`${YELLOW}Running: ${command}${RESET}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${RED}Command execution failed${RESET}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  try {
    console.log(`${GREEN}Running tests in ${testDir}${RESET}`);
    
    // Build Jest command with appropriate arguments
    const verboseFlag = verbose ? '--verbose' : '';
    const patternFlag = testPattern ? `-t "${testPattern}"` : '';
    
    // Run Jest with the specified configuration
    const success = runCommand(
      `npx jest ${testDir} ${verboseFlag} ${patternFlag} --colors --runInBand`
    );
    
    if (success) {
      console.log(`${GREEN}Tests completed successfully!${RESET}`);
    } else {
      console.error(`${RED}Tests failed!${RESET}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${RED}Test execution failed${RESET}`, error);
    process.exit(1);
  }
}

// Start the main process
main(); 