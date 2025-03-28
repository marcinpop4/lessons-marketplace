#!/usr/bin/env node
/**
 * Debug Seed Script
 * 
 * This script helps diagnose issues with the prisma seed process
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Debug Seed Script - Diagnosing seeding issues');

// Define paths
const schemaPath = 'server/prisma/schema.prisma';
const seedTsPath = 'server/prisma/seed.ts';
const seedJsPath = 'dist/server/prisma/seed.js';
const buildOutputDir = 'dist/server/prisma';

// Check if files exist
console.log('Checking for required files:');

if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Error: Prisma schema not found at ${schemaPath}`);
} else {
  console.log(`✅ Found Prisma schema at ${schemaPath}`);
}

if (!fs.existsSync(seedTsPath)) {
  console.error(`❌ Error: Seed source not found at ${seedTsPath}`);
} else {
  console.log(`✅ Found seed source at ${seedTsPath}`);
}

if (!fs.existsSync(seedJsPath)) {
  console.error(`❌ Error: Built seed not found at ${seedJsPath}`);
  
  // Check if build directory exists
  if (!fs.existsSync(buildOutputDir)) {
    console.error(`❌ Build directory ${buildOutputDir} does not exist.`);
    console.log('Creating build directory...');
    fs.mkdirSync(buildOutputDir, { recursive: true });
  } else {
    console.log(`✅ Build directory ${buildOutputDir} exists.`);
  }
} else {
  console.log(`✅ Found built seed at ${seedJsPath}`);
}

// Attempt to build the seed.js file
console.log('\n🔧 Attempting to build seed.js file:');
try {
  console.log('Running TSC build...');
  execSync('tsc --project server/tsconfig.server.json --skipLibCheck', { stdio: 'inherit' });
  console.log('✅ TSC build completed');
  
  // Check again for seed.js
  if (fs.existsSync(seedJsPath)) {
    console.log(`✅ Successfully built seed.js at ${seedJsPath}`);
  } else {
    console.error(`❌ Failed to generate seed.js at ${seedJsPath} despite successful build`);
    console.log('This suggests an issue with the TypeScript configuration or build process.');
  }
} catch (error) {
  console.error('❌ TSC build failed:', error.message);
}

// Try to run the seed file directly
console.log('\n🌱 Attempting to run seed directly:');
try {
  console.log('Running seed using TSX...');
  execSync('tsx server/prisma/seed.ts', { stdio: 'inherit' });
  console.log('✅ Seed completed successfully with TSX');
} catch (error) {
  console.error('❌ Seed failed with TSX:', error.message);
  
  if (fs.existsSync(seedJsPath)) {
    console.log('Trying to run the compiled seed.js file...');
    try {
      execSync(`node ${seedJsPath}`, { stdio: 'inherit' });
      console.log('✅ Compiled seed.js ran successfully');
    } catch (nodeError) {
      console.error('❌ Compiled seed.js failed:', nodeError.message);
    }
  }
}

console.log('\n🔍 Debug Seed Script completed'); 