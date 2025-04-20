// Node built-ins
import { execSync } from 'child_process';
import path from 'path'; // Added for potential use

// External libraries
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// --- Debugging --- 
// Moved debug logging setup earlier
const logLevel = parseInt(process.env.LOG_LEVEL || '1', 10);
const isDebugMode = process.env.DEBUG === 'true' || logLevel >= 3;

if (isDebugMode) {
  console.log('=== SERVER STARTUP DEBUG ===');
  console.log('Current working directory:', process.cwd());
  console.log('Node version:', process.version);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Environment variables (excluding sensitive data):');
  Object.keys(process.env)
    .filter(key => !key.includes('PASSWORD') && !key.includes('SECRET') && !key.includes('KEY'))
    .sort()
    .forEach(key => console.log(`${key}: ${process.env[key]}`));
  console.log('===========================');
}

// --- Environment & Config --- 

// Load environment variables from .env files first
dotenv.config();

// Load derived database configuration (e.g., setting DATABASE_URL based on parts)
// This MUST run after dotenv.config() and before Prisma client import
import './config/database.js'; // Imported for side-effects

// Validate essential environment variables
const PORT_ENV = process.env.PORT;
if (!PORT_ENV) {
  throw new Error("PORT environment variable is required");
}
const PORT = parseInt(PORT_ENV, 10);

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error("FRONTEND_URL environment variable is required");
}

// --- Prisma Client --- 

// Import prisma client (ensure it's generated during build/install)
import prisma from './prisma.js';

// REMOVED: Runtime Prisma Client Generation - This should be done at build/install time
// try { ... execSync('npx prisma generate ...') ... } catch { ... }

// Define database connection test function
async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    // In CI/production, exit on database connection failure
    if (process.env.NODE_ENV === 'production' || process.env.profile === 'ci') {
      console.error('Exiting due to database connection failure');
      process.exit(1);
    } else {
      console.warn('Continuing despite database connection failure');
    }
  }
}

// --- Route Imports --- 
import lessonRequestRoutes from './lessonRequest/lessonRequest.routes.js';
import teacherRoutes from './teacher/teacher.routes.js';
import lessonRoutes from './lesson/lesson.routes.js';
import authRoutes from './auth/auth.routes.js';
import lessonQuoteRoutes from './lessonQuote/lessonQuote.routes.js';
import addressRoutes from './address/address.routes.js';
import healthRoutes from './health/health.routes.js';
import studentRoutes from './student/student.routes.js';

// --- Express App Setup --- 
const app: Express = express();

// Core Middleware
app.use(helmet());
app.use(compression());

// Logging Middleware (Conditional)
if (logLevel >= 2) {
  // ... (morgan logging setup remains the same) ...
}

// CORS Middleware
const allowedOrigins = frontendUrl.split(',').map(url => url.trim()).filter(url => url);
if (isDebugMode) {
  console.debug('CORS allowed origins:', allowedOrigins);
}
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // Still allow for now, but log a warning
    }
  },
  credentials: true, // Allow cookies to be sent with requests
}));

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Routes --- 

// Health Check Endpoint
app.get('/api/health', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const maxRetries = 3;
  let lastError = null;

  // Try multiple times to connect to the database
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1 as health_check`;

      // Check database configuration
      const dbConfig = {
        host: process.env.DB_HOST || 'not_set',
        port: process.env.DB_PORT || 'not_set',
        database: process.env.POSTGRES_DB || 'not_set',
        user: process.env.POSTGRES_USER || 'not_set',
        url_set: Boolean(process.env.DATABASE_URL),
        ssl: process.env.DB_SSL === 'true'
      };

      res.status(200).json({
        status: 'ok',
        database: 'connected',
        attempt,
        databaseConfig: {
          ...dbConfig,
          // Mask sensitive data
          password: process.env.POSTGRES_PASSWORD ? '******' : 'not_set'
        },
        timestamp: new Date().toISOString()
      });
      return;
    } catch (error) {
      lastError = error;
      console.error(`Database connection error (attempt ${attempt}/${maxRetries}):`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  // All retries failed
  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown database error';
  const dbConfig = {
    host: process.env.DB_HOST || 'not_set',
    port: process.env.DB_PORT || 'not_set',
    database: process.env.POSTGRES_DB || 'not_set',
    user: process.env.POSTGRES_USER || 'not_set',
    url_set: Boolean(process.env.DATABASE_URL),
    ssl: process.env.DB_SSL === 'true'
  };

  res.status(500).json({
    status: 'error',
    database: 'disconnected',
    error: errorMessage,
    retries: maxRetries,
    databaseConfig: {
      ...dbConfig,
      // Mask sensitive data
      password: process.env.POSTGRES_PASSWORD ? '******' : 'not_set'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lesson-requests', lessonRequestRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/lesson-quotes', lessonQuoteRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/students', studentRoutes);

// Root Documentation Endpoint
app.get('/', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    message: 'Lessons Marketplace API Server',
    endpoints: {
      '/api/health': 'Check server health',
      '/api/v1/auth': 'Authentication endpoints (v1)',
      '/api/v1/lesson-requests': 'Lesson request endpoints (v1)',
      '/api/v1/teachers': 'Teacher endpoints (v1)',
      '/api/v1/lessons': 'Lesson endpoints (v1)',
      '/api/v1/lesson-quotes': 'Lesson quotes endpoints (v1)',
      '/api/v1/addresses': 'Address endpoints (v1)',
      '/api/v1/students': 'Student endpoints (v1)'
    }
  });
});

// --- Error Handling --- 
app.use((err: Error | any, req: Request, res: Response, next: NextFunction) => {
  // Log detailed error information
  console.error('[GLOBAL ERROR HANDLER] Caught error:');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);

  // Log different properties depending on the error type
  if (err instanceof Error) {
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
  } else {
    // Log non-Error objects as best as possible
    console.error('Caught non-Error object:', err);
  }

  // Ensure response status is set, even if error occurred before setting status
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Something went wrong!',
      // Optionally include stack in development
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    // If headers were already sent, we can only close the connection
    console.error('[GLOBAL ERROR HANDLER] Headers already sent, cannot send JSON error response.');
    next(err); // Delegate to default Express error handler if possible
  }
});

// --- Start Server Logic --- 
async function startServer() {
  try {
    // Ensure database is connected BEFORE starting the listener
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1); // Exit if server fails to start (e.g., DB connection failed initially)
  }
}

// --- Graceful Shutdown Logic --- 
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived signal ${signal}. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    // Add any other cleanup tasks here (e.g., closing message queues)
    console.log('Shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// --- Initialize Server --- 
startServer();

// Keep export default app if needed for other purposes (like programmatic testing imports)
// If not needed, it can be safely removed when running as a script.
export default app; 