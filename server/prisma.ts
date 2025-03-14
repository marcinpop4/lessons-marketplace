// For ESM, import the PrismaClient directly
import { PrismaClient } from '@prisma/client';
// Import the database configuration
import './config/database.js';

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma; 