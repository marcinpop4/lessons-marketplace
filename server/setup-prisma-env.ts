/**
 * Setup Prisma environment variables for migrations
 * 
 * This script uses the centralized database URL utility from config/database.ts
 * to set up the DATABASE_URL for Prisma migrations.
 */

// Import the database URL utility
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getDatabaseUrl, loadEnvFromPath } from './config/database.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the project root .env file
const envPath = resolve(__dirname, '../.env');
loadEnvFromPath(envPath);

// Build the database URL using the central utility and set it for Prisma
const databaseUrl = getDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

// Export the database URL
export default databaseUrl; 