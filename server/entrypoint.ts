#!/usr/bin/env node

/**
 * Server entrypoint script
 * 
 * This script prepares the database connection, runs migrations,
 * and starts the server.
 */

import { spawnSync, spawn, SpawnSyncReturns } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseUrl, loadEnvFromPath } from './config/database.js';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnvFromPath();

// Function to check if PostgreSQL is ready
async function waitForPostgres(): Promise<void> {
  console.log('Waiting for PostgreSQL to be ready...');
  console.log(`Using database connection: host=${process.env.DB_HOST}, port=${process.env.DB_PORT}`);
  
  // Try to connect to PostgreSQL using pg_isready
  let isReady = false;
  while (!isReady) {
    try {
      const host = process.env.DB_HOST;
      const port = process.env.DB_PORT;
      
      if (!host) {
        throw new Error('DB_HOST environment variable is required');
      }
      
      if (!port) {
        throw new Error('DB_PORT environment variable is required');
      }
      
      const result: SpawnSyncReturns<Buffer> = spawnSync('pg_isready', [
        '-h', host, 
        '-p', port
      ]);
      
      if (result.status === 0) {
        isReady = true;
        console.log('PostgreSQL is up and running!');
      } else {
        console.log('PostgreSQL is unavailable - sleeping');
        // Sleep for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error checking PostgreSQL readiness:', error instanceof Error ? error.message : String(error));
      // Sleep for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Main function to run the server
async function main(): Promise<void> {
  try {
    // Wait for PostgreSQL to be ready
    await waitForPostgres();
    
    // Build the database URL using the central utility
    const databaseUrl = getDatabaseUrl();
    process.env.DATABASE_URL = databaseUrl;
    
    // Run database migrations
    console.log('Running database migrations...');
    const migrateResult = spawnSync('npx', ['prisma', 'migrate', 'deploy', '--schema=server/prisma/schema.prisma'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    
    if (migrateResult.status !== 0) {
      throw new Error(`Migration failed with status code: ${migrateResult.status}`);
    }
    
    // Generate Prisma client
    console.log('Generating Prisma client...');
    const generateResult = spawnSync('npx', ['prisma', 'generate', '--schema=server/prisma/schema.prisma'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    
    if (generateResult.status !== 0) {
      throw new Error(`Prisma client generation failed with status code: ${generateResult.status}`);
    }
    
    // Debug information
    console.log('Listing dist/server directory:');
    const ls = spawnSync('ls', ['-la', 'dist/server']);
    console.log(ls.stdout.toString());
    
    // Try to find the index.js file
    console.log('Finding index.js files:');
    const find = spawnSync('find', ['dist/server', '-name', 'index.js']);
    console.log(find.stdout.toString());
    
    // Start the server
    console.log('Starting server...');
    
    // Try the direct path first
    if (fs.existsSync('dist/server/index.js')) {
      console.log('Using dist/server/index.js');
      const server = spawn('node', ['dist/server/index.js'], { 
        stdio: 'inherit', 
        env: { ...process.env, DATABASE_URL: databaseUrl } 
      });
      
      // Handle server process events
      server.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (code === undefined || code === null) {
          process.exit(1);
        } else {
          process.exit(code);
        }
      });
      
      // Forward signals to the child process
      ['SIGINT', 'SIGTERM'].forEach(signal => {
        process.on(signal, () => {
          if (!server.killed) {
            server.kill(signal as NodeJS.Signals);
          }
        });
      });
    } else {
      throw new Error('Error: Could not find index.js in dist/server');
    }
  } catch (error) {
    console.error('Error in entrypoint script:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the main function
main(); 