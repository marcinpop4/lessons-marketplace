#!/usr/bin/env tsx

/**
 * This script deploys the application to Docker.
 * It builds the Docker images and starts the containers.
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define environment
const isProduction = process.argv.includes('--production');
const envFile = isProduction ? '.env.production' : '.env';
const composeFile = join(__dirname, '..', 'docker-compose.yml');

// Get the root directory
const rootDir = join(__dirname, '..', '..');
const envPath = join(rootDir, envFile);

// Load environment variables
console.log(`Loading environment variables from ${envFile}...`);
if (!fs.existsSync(envPath)) {
  console.error(`Error: ${envFile} file not found at ${envPath}`);
  console.error('Please create this file with the required environment variables.');
  process.exit(1);
}

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error(`Error loading environment variables: ${result.error.message}`);
  process.exit(1);
}

// Validate required environment variables
const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'PORT',
  'JWT_SECRET'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Error: The following required environment variables are missing in ${envFile}:`);
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

console.log(`Deploying application using ${envFile} environment...`);

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

// Function to run database migrations
function runDatabaseMigrations(): void {
  console.log('Running database migrations...');
  
  try {
    // Wait a moment to ensure database is fully ready
    console.log('Waiting for database to be ready...');
    execute(`docker-compose -f ${composeFile} exec -T database pg_isready -U ${process.env.DB_USER} -d ${process.env.DB_NAME}`);
    
    // Run Prisma migrations using the server container
    console.log('Applying database migrations...');
    execute(`docker-compose -f ${composeFile} exec -T server npx prisma migrate deploy --schema=server/prisma/schema.prisma`);
    
    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Failed to run migrations. The database may not be initialized properly.');
    console.error('Please check the logs and try running migrations manually with:');
    console.error(`docker-compose -f ${composeFile} exec server npx prisma migrate deploy --schema=server/prisma/schema.prisma`);
    // We don't exit here to allow the application to continue - the user can fix migrations later
  }
}

// Ensure the application is built
if (!fs.existsSync(join(rootDir, 'dist'))) {
  console.log('Application not built. Building now...');
  execute(`tsx ${join(__dirname, 'build.ts')} ${isProduction ? '--production' : ''}`, true);
}

// Deploy to Docker
console.log('Deploying to Docker...');

// Stop and remove existing containers
execute(`docker-compose -f ${composeFile} down`);

// Build and start containers
execute(`docker-compose -f ${composeFile} up -d --build`);

// Run database migrations
runDatabaseMigrations();

console.log('Deployment completed successfully!');
console.log('Services:');
console.log('- Database: Running on port', process.env.DB_PORT || 5432);
console.log('- Server: Running on port', process.env.PORT || 3000);
console.log('- Frontend: Running on port 5173'); 