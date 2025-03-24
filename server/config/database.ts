/**
 * Database configuration
 * 
 * This module builds the database connection URL from individual environment variables
 * and exports it for use in the application.
 * 
 * Single source of truth for database URL construction.
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';

/**
 * Load environment variables from a specific path
 * @param envPath Optional path to .env file
 */
export const loadEnvFromPath = (envPath?: string): void => {
  if (envPath && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }
};

// By default, load from default location
loadEnvFromPath();

/**
 * Mask a database URL for secure logging by hiding the password
 * @param url The database URL to mask
 * @returns The masked URL
 */
export const maskDatabaseUrl = (url: string): string => {
  return url.includes('@') 
    ? url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:******@')
    : url;
};

/**
 * Build a database URL from environment variables
 * @param options Optional parameters to override environment variables
 * @returns The constructed database URL
 */
export const getDatabaseUrl = (options?: {
  host?: string;
  port?: string | number;
  name?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  useEnvUrl?: boolean;
}): string => {
  const isDebugMode = process.env.DEBUG === 'true';
  
  // Check if DATABASE_URL is directly provided and should be used
  if (process.env.DATABASE_URL) {
    if (isDebugMode) {
      logger.debug('Using DATABASE_URL from environment variables');
      const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL);
      logger.debug(`Database URL: ${maskedUrl}`);
    }
    
    return process.env.DATABASE_URL;
  } else {
    // Get database configuration from environment variables or options
    const DB_HOST = options?.host || process.env.DB_HOST;
    const DB_PORT = options?.port?.toString() || process.env.DB_PORT;
    const DB_NAME = options?.name || process.env.DB_NAME;
    const DB_USER = options?.user || process.env.DB_USER;
    const DB_PASSWORD = options?.password || process.env.DB_PASSWORD;
    const DB_SSL = options?.ssl !== undefined ? options.ssl : (process.env.DB_SSL === 'true');

    // Validate all required parameters are present
    if (!DB_HOST) {
      throw new Error('Database host is required but not provided');
    }
    
    if (!DB_PORT) {
      throw new Error('Database port is required but not provided');
    }
    
    if (!DB_NAME) {
      throw new Error('Database name is required but not provided');
    }
    
    if (!DB_USER) {
      throw new Error('Database user is required but not provided');
    }

    // Build the database URL from individual components
    // Always include the sslmode parameter explicitly
    const sslParam = DB_SSL ? '?sslmode=require' : '?sslmode=disable';
    const passwordPart = DB_PASSWORD ? `:${DB_PASSWORD}` : '';
    
    const url = `postgresql://${DB_USER}${passwordPart}@${DB_HOST}:${DB_PORT}/${DB_NAME}${sslParam}`;
    
    // Log the database URL (with masked password for security) only in debug mode
    if (isDebugMode) {
      const maskedUrl = maskDatabaseUrl(url);
      logger.debug(`Built database URL from environment variables: ${maskedUrl}`);
      logger.debug(`SSL mode: ${DB_SSL ? 'enabled (require)' : 'disabled'}`);
    }
    
    return url;
  }
};

// Get the database URL and set it for Prisma
const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

// Export the URL and the function
export default databaseUrl; 