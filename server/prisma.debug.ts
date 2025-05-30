import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import prisma from './prisma.js';
import { createChildLogger } from './config/logger.js';

// Load environment variables
dotenv.config();

const logger = createChildLogger('prisma-debug');

logger.info('=== PRISMA DEBUG INFO ===');

// Check OpenSSL version
try {
  logger.info('Checking OpenSSL version');
  const opensslVersion = execSync('openssl version').toString().trim();
  logger.info('OpenSSL version detected', { version: opensslVersion });
} catch (error) {
  logger.error('Error checking OpenSSL version', { error });
}

// Check for DATABASE_URL
logger.info('Checking DATABASE_URL configuration');
if (process.env.DATABASE_URL) {
  // Mask password for security
  const maskedUrl = process.env.DATABASE_URL.replace(
    /\/\/([^:]+):([^@]+)@/,
    '//$1:******@'
  );
  logger.info('DATABASE_URL is configured', { url: maskedUrl });
} else {
  logger.warn('DATABASE_URL is not set');

  // Check individual database config variables
  const dbVars = [
    'DB_HOST',
    'DB_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DB_SSL'
  ];

  const dbConfig: Record<string, string> = {};
  dbVars.forEach(varName => {
    const value = process.env[varName];
    if (varName === 'POSTGRES_PASSWORD' && value) {
      dbConfig[varName] = '******';
    } else {
      dbConfig[varName] = value || 'not set';
    }
  });

  logger.info('Individual database configuration variables', { config: dbConfig });
}

// Check if prisma schema exists
const schemaPath = 'server/prisma/schema.prisma';
logger.info('Checking schema file existence', { path: schemaPath });

if (fs.existsSync(schemaPath)) {
  logger.info('Schema file exists');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  logger.debug('Schema file contents preview', {
    preview: schema.substring(0, 500) + '...',
    size: schema.length
  });
} else {
  logger.error('Schema file does not exist', { expectedPath: schemaPath });
  // Try to find it elsewhere
  try {
    const possibleLocations = execSync('find . -name "schema.prisma"').toString().trim();
    logger.info('Found possible schema locations', { locations: possibleLocations.split('\n') });
  } catch (error) {
    logger.error('Error finding schema file', { error });
  }
}

// Try to connect to the database
logger.info('Attempting database connection test');

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    logger.info('Database connection successful', { testResult: result });
  } catch (error) {
    logger.error('Database connection failed', { error });
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

// Use the singleton instance
export default prisma; 