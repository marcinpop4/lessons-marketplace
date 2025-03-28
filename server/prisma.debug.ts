import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Load environment variables
dotenv.config();

console.log('=== PRISMA DEBUG INFO ===');

// Check OpenSSL version
try {
  console.log('Checking OpenSSL version:');
  const opensslVersion = execSync('openssl version').toString().trim();
  console.log(opensslVersion);
} catch (error) {
  console.error('Error checking OpenSSL version:', error);
}

// Check for DATABASE_URL
console.log('\nChecking DATABASE_URL:');
if (process.env.DATABASE_URL) {
  // Mask password for security
  const maskedUrl = process.env.DATABASE_URL.replace(
    /\/\/([^:]+):([^@]+)@/,
    '//$1:******@'
  );
  console.log(`DATABASE_URL is set: ${maskedUrl}`);
} else {
  console.log('DATABASE_URL is not set!');
  
  // Check individual database config variables
  const dbVars = [
    'DB_HOST',
    'DB_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DB_SSL'
  ];
  
  dbVars.forEach(varName => {
    const value = process.env[varName];
    if (varName === 'POSTGRES_PASSWORD' && value) {
      console.log(`${varName} = ******`);
    } else {
      console.log(`${varName} = ${value || 'not set'}`);
    }
  });
}

// Check if prisma schema exists
const schemaPath = 'server/prisma/schema.prisma';
console.log(`\nChecking if schema exists at path: ${schemaPath}`);
if (fs.existsSync(schemaPath)) {
  console.log('Schema file exists');
  console.log('Schema file contents:');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  console.log(schema.substring(0, 500) + '...');
} else {
  console.log('Schema file does not exist!');
  // Try to find it elsewhere
  try {
    const possibleLocations = execSync('find . -name "schema.prisma"').toString().trim();
    console.log('Possible schema locations:');
    console.log(possibleLocations);
  } catch (error) {
    console.error('Error finding schema:', error);
  }
}

// Try to connect to the database
console.log('\nAttempting to connect to database...');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful!');
    console.log('Query result:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 