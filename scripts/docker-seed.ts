#!/usr/bin/env node
/**
 * Docker Seed Script
 * 
 * This script ensures the Prisma client is generated before running the seed script
 * to prevent initialization errors in Docker environments.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('🌱 Docker Seed Script - Initializing database seeding process');

// Define paths
const schemaPath = 'server/prisma/schema.prisma';
const seedPath = 'dist/server/prisma/seed.js';

// Check if files exist
if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Error: Prisma schema not found at ${schemaPath}`);
  process.exit(1);
}

if (!fs.existsSync(seedPath)) {
  console.error(`❌ Error: Seed script not found at ${seedPath}`);
  process.exit(1);
}

try {
  // Step 1: Generate Prisma client
  console.log('📊 Generating Prisma client...');
  execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');
  
  // Step 2: Run the seed script
  console.log('🌱 Running seed script...');
  execSync(`node ${seedPath}`, { stdio: 'inherit' });
  console.log('✅ Database seeding completed successfully');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error during seeding process:', error);
  process.exit(1);
} 