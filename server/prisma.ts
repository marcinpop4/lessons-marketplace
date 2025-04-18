// For ESM, import the PrismaClient directly
import { PrismaClient } from '@prisma/client';
// Import the database configuration
import './config/database.js';

// Determine if we're in debug mode based on log level
const isDebugMode = process.env.NODE_ENV === 'development';

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: isDebugMode ? ['warn', 'error'] : ['error'], // when wanting the query logs to come back, use ['query', 'warn', 'error']
});

export default prisma; 