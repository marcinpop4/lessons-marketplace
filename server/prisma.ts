// For ESM, import the PrismaClient directly
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for LogLevel type
// Import the database configuration
import './config/database.js';

// In development, we need to store the PrismaClient instance globally
// to prevent creating multiple instances during hot reloading.
// In production, the app runs without reloading, so we don't need this.
declare global {
  var prisma: PrismaClient | undefined;
}

// Configure logging based on environment
const getLogLevels = (): Prisma.LogLevel[] => {
  const levels: Prisma.LogLevel[] = ['warn']; // Always log warnings

  if (process.env.SILENCE_PRISMA_EXPECTED_ERRORS !== 'true') {
    levels.push('error');
  }

  if (process.env.NODE_ENV === 'development') {
    levels.push('info');
  }

  return levels;
};

// In development: Reuse existing instance if one exists (stored in global)
// In production: Always create a new instance (module loaded only once)
const prisma = process.env.NODE_ENV === 'development'
  ? global.prisma || new PrismaClient({ log: getLogLevels() })
  : new PrismaClient({ log: getLogLevels() });

// Store instance in global to prevent multiple instances in development
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma; 