/**
 * Setup Prisma environment variables for migrations
 * 
 * This script builds the DATABASE_URL from individual environment variables
 * and exports it for Prisma to use during migrations.
 */

// Load environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

// Get database configuration from environment variables
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = process.env.DB_PORT || '';
const DB_NAME = process.env.DB_NAME || '';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_SSL = process.env.DB_SSL === 'true';

// Build the database URL from individual components
const buildDatabaseUrl = () => {
  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER) {
    throw new Error('Missing required database configuration. Please set DB_HOST, DB_PORT, DB_NAME, and DB_USER environment variables.');
  }
  
  const sslParam = DB_SSL ? '?sslmode=require' : '';
  const passwordPart = DB_PASSWORD ? `:${DB_PASSWORD}` : '';
  
  const url = `postgresql://${DB_USER}${passwordPart}@${DB_HOST}:${DB_PORT}/${DB_NAME}${sslParam}`;
  
  // Log the database URL (with masked password for security)
  const maskedUrl = DB_PASSWORD 
    ? url.replace(DB_PASSWORD, '******') 
    : url;
  
  console.log(`Built database URL from environment variables: ${maskedUrl}`);
  
  return url;
};

// Build the database URL and set it for Prisma
const databaseUrl = buildDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

// Export the database URL
export default databaseUrl; 