#!/usr/bin/env tsx

/**
 * This script builds the application for Docker deployment.
 * It compiles both the frontend and server.
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define environment
const isProduction = process.argv.includes('--production');
const envFile = isProduction ? '.env.production' : '.env';

// Get the root directory
const rootDir = join(__dirname, '..', '..');
const envPath = join(rootDir, envFile);

// Load environment variables
console.log(`Loading environment variables from ${envFile}...`);
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error(`Error loading environment variables: ${result.error.message}`);
    process.exit(1);
  }
} else {
  console.warn(`Warning: ${envFile} file not found. Using default environment variables.`);
}

console.log(`Building application using ${envFile} environment...`);

// Function to execute shell commands
function execute(command: string, safeNodeOptions = false): void {
  try {
    console.log(`Executing: ${command}`);
    const env = { ...process.env };
    
    // Some commands may fail with certain NODE_OPTIONS settings
    if (safeNodeOptions && env.NODE_OPTIONS) {
      const originalOptions = env.NODE_OPTIONS;
      
      // Remove problematic flags like --no-experimental-fetch
      env.NODE_OPTIONS = originalOptions
        .split(' ')
        .filter(opt => !opt.includes('experimental-fetch'))
        .join(' ');
      
      if (env.NODE_OPTIONS !== originalOptions) {
        console.log(`Modified NODE_OPTIONS from "${originalOptions}" to "${env.NODE_OPTIONS}"`);
      }
      
      // If we've removed all options, delete the variable
      if (!env.NODE_OPTIONS.trim()) {
        console.log('All NODE_OPTIONS were removed, unsetting the variable');
        delete env.NODE_OPTIONS;
      }
    }
    
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env
    });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

// Clean the dist directory
console.log('Cleaning dist directory...');
try {
  if (fs.existsSync(join(rootDir, 'dist'))) {
    // Run clean command with safe NODE_OPTIONS
    execute('pnpm run clean', true);
  }
} catch (error) {
  console.error('Error cleaning dist directory:', error);
}

// Build the application
console.log('Building application...');
execute('pnpm run build', true);

console.log('Build completed successfully!'); 