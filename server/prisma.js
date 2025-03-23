import { PrismaClient } from '@prisma/client';

// Configure logging based on environment variables
const isDebugMode = process.env.DEBUG === 'true';

// Only log in debug mode, otherwise disable all logs
const logOptions = isDebugMode
  ? ['query', 'info', 'warn', 'error']
  : [];

const prisma = new PrismaClient({
  log: logOptions,
});

export default prisma; 