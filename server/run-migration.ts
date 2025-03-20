#!/usr/bin/env node

/**
 * Run database migrations using Prisma
 * 
 * This script uses the centralized database URL utility from config/database.ts
 * to set up the DATABASE_URL for Prisma migrations.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseUrl, loadEnvFromPath } from './config/database.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root .env file
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading environment from: ${envPath}`);
loadEnvFromPath(envPath);

// Build the database URL using the central utility
const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

// Run the Prisma migration
console.log('Running database migrations...');
const result = spawnSync('npx', ['prisma', 'migrate', 'dev', '--name', 'add_address_model'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl
  }
});

// Check if the migration was successful
if (result.status !== 0) {
  console.error('Migration failed with status code:', result.status);
  process.exit(result.status || 1);
}

console.log('Migration completed successfully!'); 