#!/usr/bin/env tsx

/**
 * This script cleans up Docker resources.
 * It stops and removes containers, images, and volumes without prompting.
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Process arguments
const args = process.argv.slice(2);
const removeVolumes = args.includes('--volumes') || args.includes('-v');
const removeImages = args.includes('--images') || args.includes('-i');
const pruneDangling = args.includes('--prune') || args.includes('-p');
const removeAll = args.includes('--all') || args.includes('-a') || args.length === 0;
const isProduction = args.includes('--production');

// Get the root directory and relevant paths
const rootDir = join(__dirname, '..', '..');
const composeFile = join(__dirname, '..', 'docker-compose.yml');

// Load environment variables
const envFile = isProduction ? '.env.production' : '.env';
const envPath = join(rootDir, envFile);

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envFile}`);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error(`Error loading environment variables: ${result.error.message}`);
  }
} else {
  console.warn(`Warning: ${envFile} not found. Some Docker commands may fail.`);
}

// Function to execute shell commands
function execute(command: string, safeNodeOptions = false): void {
  try {
    console.log(`Executing: ${command}`);
    
    // Create a copy of the environment
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
    
    // Use environment variables from process.env
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env
    });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
  }
}

// Main cleanup function
function cleanup() {
  console.log('Docker Cleanup Utility');
  console.log('---------------------');
  console.log(`Using environment from: ${envFile}`);

  // Stop and remove containers
  console.log('Stopping and removing containers...');
  execute(`docker-compose -f ${composeFile} down`, true);

  // Remove volumes if specified or if --all flag is used
  if (removeVolumes || removeAll) {
    console.log('Removing volumes...');
    execute(`docker-compose -f ${composeFile} down -v`, true);
  }

  // Remove images if specified or if --all flag is used
  if (removeImages || removeAll) {
    console.log('Removing images...');
    execute('docker rmi lessons-marketplace-server lessons-marketplace-frontend', true);
  }

  // Prune dangling resources if specified or if --all flag is used
  if (pruneDangling || removeAll) {
    console.log('Pruning dangling resources...');
    execute('docker system prune -f', true);
  }

  console.log('Cleanup completed successfully!');
}

// Show help message if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: tsx cleanup.ts [options]

Options:
  -v, --volumes     Remove Docker volumes
  -i, --images      Remove Docker images
  -p, --prune       Prune dangling Docker resources
  -a, --all         Remove all Docker resources (default if no options specified)
  --production      Use production environment variables (.env.production)
  -h, --help        Show this help message
`);
  process.exit(0);
}

// Run the cleanup function
cleanup(); 