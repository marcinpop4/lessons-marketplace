// For ESM, import the PrismaClient directly
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for LogLevel type
// Import the database configuration
import './config/database.js';

// Determine if we're in debug mode based on log level
const isDebugMode = process.env.NODE_ENV === 'development';
const silencePrismaErrors = process.env.SILENCE_PRISMA_EXPECTED_ERRORS === 'true';

// Define log levels based on environment
let logLevels: Prisma.LogLevel[] = ['warn']; // Always include warnings
if (!silencePrismaErrors) {
  logLevels.push('error'); // Add errors unless specifically silenced
}
if (isDebugMode) {
  // Add info in development (optional, could add 'query' here too if needed)
  logLevels.push('info');
}

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: logLevels,
});

export default prisma; 