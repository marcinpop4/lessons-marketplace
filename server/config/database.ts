/**
 * Database configuration
 * 
 * This module builds the database connection URL from individual environment variables
 * and exports it for use in the application.
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Function to get the database URL
const getDatabaseUrl = (): string => {
  // Check if DATABASE_URL is directly provided
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL from environment variables');
    // Log the database URL (with masked password for security)
    const maskedUrl = process.env.DATABASE_URL.includes('@') 
      ? process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:******@')
      : process.env.DATABASE_URL;
    
    console.log(`Database URL: ${maskedUrl}`);
    
    return process.env.DATABASE_URL;
  } else {
    // Get database configuration from environment variables
    const DB_HOST = process.env.DB_HOST || '';
    const DB_PORT = process.env.DB_PORT || '';
    const DB_NAME = process.env.DB_NAME || '';
    const DB_USER = process.env.DB_USER || '';
    const DB_PASSWORD = process.env.DB_PASSWORD || '';
    const DB_SSL = process.env.DB_SSL === 'true';

    // Build the database URL from individual components
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
  }
};

// Get the database URL and set it for Prisma
const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

// Export the URL
export default databaseUrl; 