// For ESM, import the PrismaClient directly
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma; 