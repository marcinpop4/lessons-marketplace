#!/usr/bin/env node

/**
 * Server entrypoint script
 * 
 * This script prepares the database connection, runs migrations,
 * and starts the server.
 */

import { execSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No color

// Get environment variables
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const nodeEnv = process.env.NODE_ENV || 'development'; // Keep this fallback as it's a standard practice
const databaseUrl = process.env.DATABASE_URL;

// Validate required environment variables
function validateEnvironment() {
  const required = {
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_NAME: dbName,
    DB_USER: dbUser,
    DB_PASSWORD: dbPassword
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`${RED}Missing required environment variables: ${missing.join(', ')}${NC}`);
    process.exit(1);
  }
}

async function checkDatabaseConnection(): Promise<boolean> {
  console.log(`${YELLOW}Checking database connection...${NC}`);
  
  const maxRetries = 30;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Try to connect to the database using individual parameters
      console.log(`${YELLOW}Using connection parameters: Host=${dbHost}, DB=${dbName}, User=${dbUser}${NC}`);
      
      const result = spawnSync('psql', [
        '-h', dbHost as string,
        '-U', dbUser as string,
        '-d', dbName as string,
        '-c', 'SELECT 1'
      ], {
        env: { ...process.env, PGPASSWORD: dbPassword as string },
        stdio: 'pipe' // Change to pipe to capture error output
      });
      
      if (result.status === 0) {
        console.log(`${GREEN}Database connection established!${NC}`);
        return true;
      } else {
        // Log the error for debugging
        const stderr = result.stderr ? result.stderr.toString() : 'No error output';
        console.log(`${YELLOW}Connection attempt failed: ${stderr}${NC}`);
      }
    } catch (error) {
      // Log the error for debugging
      console.log(`${YELLOW}Connection error: ${error}${NC}`);
    }
    
    retryCount++;
    console.log(`${YELLOW}Waiting for database to be ready... (${retryCount}/${maxRetries})${NC}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  }
  
  console.error(`${RED}Failed to connect to database after ${maxRetries} attempts. Exiting.${NC}`);
  return false;
}

async function runMigrations(): Promise<boolean> {
  console.log(`${YELLOW}Running database migrations...${NC}`);
  
  try {
    // Construct the DATABASE_URL from individual parameters
    const constructedUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=disable`;
    console.log(`${YELLOW}Using constructed DATABASE_URL for Prisma${NC}`);
    
    // Set the DATABASE_URL directly in the environment for this process
    process.env.DATABASE_URL = constructedUrl;
    
    // Run migrations with the environment variable now set
    execSync('npx prisma migrate deploy --schema=server/prisma/schema.prisma', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: constructedUrl }
    });
    
    // Keep DATABASE_URL set for the rest of the application
    process.env.DATABASE_URL = constructedUrl;
    
    console.log(`${GREEN}Migrations completed successfully!${NC}`);
    return true;
  } catch (error) {
    console.error(`${RED}Failed to run migrations:${NC}`, error);
    return false;
  }
}

function startServer() {
  console.log(`${YELLOW}Starting server in ${nodeEnv} mode...${NC}`);
  
  // Ensure HOST and PORT are set in the environment
  process.env.HOST = '0.0.0.0';
  process.env.PORT = '3000';
  
  if (nodeEnv === 'development') {
    // Use npm run start:ts for development
    const server = spawn('npm', ['run', 'start:ts'], { 
      stdio: 'inherit',
      detached: false 
    });
    
    server.on('error', (error) => {
      console.error(`${RED}Failed to start server:${NC}`, error);
      process.exit(1);
    });

    // Wait for server process to exit
    server.on('exit', (code) => {
      console.log(`${YELLOW}Server process exited with code ${code}${NC}`);
      process.exit(code || 0);
    });
  } else {
    // Use node directly for production
    console.log(`${YELLOW}Starting server from dist/server/index.js${NC}`);
    const server = spawn('node', ['dist/server/index.js'], { 
      stdio: 'inherit',
      detached: false,
      env: {
        ...process.env,
        HOST: '0.0.0.0',
        PORT: '3000'
      }
    });
    
    server.on('error', (error) => {
      console.error(`${RED}Failed to start server:${NC}`, error);
      process.exit(1);
    });

    // Wait for server process to exit
    server.on('exit', (code) => {
      console.log(`${YELLOW}Server process exited with code ${code}${NC}`);
      process.exit(code || 0);
    });
  }
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

  // Set DATABASE_URL right at the start
  const constructedUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=disable`;
  process.env.DATABASE_URL = constructedUrl;
  console.log(`${YELLOW}Set DATABASE_URL for the application${NC}`);

  // Check database connection
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    process.exit(1);
  }
  
  // Run migrations
  const migrationsSuccessful = await runMigrations();
  if (!migrationsSuccessful) {
    process.exit(1);
  }
  
  // Start the server
  startServer();
}

// Handle exit signals
process.on('SIGINT', () => {
  console.log(`${YELLOW}Server shutting down...${NC}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`${YELLOW}Server shutting down...${NC}`);
  process.exit(0);
});

// Start the main process
main().catch(error => {
  console.error(`${RED}An unexpected error occurred:${NC}`, error);
  process.exit(1);
}); 