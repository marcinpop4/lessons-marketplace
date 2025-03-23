// For ESM, import the PrismaClient directly
import { PrismaClient } from '@prisma/client';
// Import the database configuration
import './config/database.js';
// Import the logger
import logger, { LogLevel } from './utils/logger.js';

// Determine if we're in debug mode based on log level
const isDebugMode = logger.getLogLevel() === LogLevel.DEBUG;

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: isDebugMode ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma; 