#!/usr/bin/env node

/**
 * Server entrypoint script
 * 
 * This script prepares the database connection, runs migrations,
 * and starts the server. It works in both local development and Fly.io environments.
 */

import { execSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No Color

// Check for command line arguments
const runMigrationsOnly = process.argv.includes('--run-migrations-only');
const isProduction = process.env.NODE_ENV === 'production';
const isFlyIo = process.env.FLY_APP_NAME !== undefined;

// Get and validate required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'FRONTEND_URL'
];

// Check for missing required variables and fail fast
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`${RED}ERROR: Missing required environment variables: ${missingVars.join(', ')}${NC}`);
  console.error(`${RED}Please set these variables in your .env or .env.production file${NC}`);
  process.exit(1);
}

// All required variables are now available
const dbHost = process.env.DB_HOST!;
const dbPort = process.env.DB_PORT!;
const dbName = process.env.DB_NAME!;
const dbUser = process.env.DB_USER!;
const dbPassword = process.env.DB_PASSWORD!;
const dbSsl = process.env.DB_SSL === 'true';
const nodeEnv = process.env.NODE_ENV!;
const frontendUrl = process.env.FRONTEND_URL!;

// Construct the DATABASE_URL for Prisma
const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public${dbSsl ? '&sslmode=require' : ''}`;
process.env.DATABASE_URL = databaseUrl;

console.log(`${YELLOW}Environment: NODE_ENV=${nodeEnv}, Running in ${isFlyIo ? 'Fly.io' : 'local'} environment${NC}`);
console.log(`${YELLOW}Using DB Host: ${dbHost}, Port: ${dbPort}, Name: ${dbName}, User: ${dbUser}${NC}`);
console.log(`${YELLOW}Frontend URL: ${frontendUrl}${NC}`);

async function checkDatabaseConnection(): Promise<boolean> {
  console.log(`${YELLOW}Checking database connection...${NC}`);
  
  const maxRetries = 30;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // Try to connect to the database using psql
      console.log(`${YELLOW}Attempting database connection to: ${dbHost}:${dbPort}/${dbName}${NC}`);
      
      const result = spawnSync('psql', [
        '-h', dbHost,
        '-U', dbUser,
        '-d', dbName,
        '-c', 'SELECT 1'
      ], {
        env: { ...process.env, PGPASSWORD: dbPassword },
        stdio: 'pipe'
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
    // Use the DATABASE_URL set earlier
    console.log(`${YELLOW}Using DATABASE_URL for Prisma migrations${NC}`);
    
    // Run migrations
    execSync('npx prisma migrate deploy --schema=server/prisma/schema.prisma', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
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
  process.env.HOST = process.env.HOST || '0.0.0.0';
  process.env.PORT = process.env.PORT || '3000';
  
  if (nodeEnv === 'development') {
    // Run server/index.ts directly instead of recursively calling this script
    const server = spawn('tsx', ['server/index.ts'], { 
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
        HOST: process.env.HOST || '0.0.0.0',
        PORT: process.env.PORT || '3000'
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
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error(`${RED}Database connection failed. Exiting.${NC}`);
      process.exit(1);
    }
    
    // Run migrations
    const migrationsSuccessful = await runMigrations();
    if (!migrationsSuccessful) {
      console.error(`${RED}Database migrations failed. Exiting.${NC}`);
      process.exit(1);
    }

    // If --run-migrations-only flag is provided, exit after migrations
    if (runMigrationsOnly) {
      console.log(`${GREEN}Migrations completed successfully. Exiting as requested.${NC}`);
      process.exit(0);
    }
    
    // Start the server
    startServer();
  } catch (error) {
    console.error(`${RED}An unexpected error occurred:${NC}`, error);
    process.exit(1);
  }
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