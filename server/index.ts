// Node built-ins
import { execSync } from 'child_process';
import path from 'path'; // Added for potential use

// External libraries
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { AppError } from './errors/index.js'; // Import base error
// Import ZodError
import { ZodError } from 'zod';

// Logging
import { logger, createChildLogger } from '../config/logger.js';
import { httpLogger } from './config/httpLogger.js';

// --- Debugging --- 
// Moved debug logging setup earlier
const logLevel = parseInt(process.env.LOG_LEVEL || '1', 10);
const isDebugMode = process.env.DEBUG === 'true' || logLevel >= 3;

if (isDebugMode) {
  logger.info('=== SERVER STARTUP DEBUG ===');
  logger.info('Current working directory: ' + process.cwd());
  logger.info('Node version: ' + process.version);
  logger.info('NODE_ENV: ' + process.env.NODE_ENV);
  logger.info('LOG_LEVEL: ' + process.env.LOG_LEVEL);
  logger.info('Effective log level: ' + (logger as any).level);
  logger.info('Environment variables (excluding sensitive data):');
  Object.keys(process.env)
    .filter(key => !key.includes('PASSWORD') && !key.includes('SECRET') && !key.includes('KEY'))
    .sort()
    .forEach(key => logger.debug(`${key}: ${process.env[key]}`));
  logger.info('===========================');
} else {
  // Always log basic startup info in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('🚀 Development server starting...');
    logger.info(`📝 Log level: ${process.env.LOG_LEVEL || 'info'}`);
  }
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
    logger.info('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    // In CI/production, exit on database connection failure
    if (process.env.NODE_ENV === 'production' || process.env.profile === 'ci') {
      logger.error('Exiting due to database connection failure');
      process.exit(1);
    } else {
      logger.warn('Continuing despite database connection failure');
    }
  }
}

// --- Route Imports --- 
import addressRoutes from './address/address.routes.js';
import authRoutes from './auth/auth.routes.js';
import loggerRoutes from './clientLogger/clientLogger.routes.js';
import healthRoutes from './health/health.routes.js';
import lessonPlanRoutes from './lessonPlan/lessonPlan.routes.js';
import lessonQuoteRoutes from './lessonQuote/lessonQuote.routes.js';
import lessonRequestRoutes from './lessonRequest/lessonRequest.routes.js';
import lessonRoutes from './lesson/lesson.routes.js';
import lessonSummaryRoutes from './lessonSummary/lessonSummary.routes.js';
import milestoneRoutes from './milestone/milestone.routes.js';
import objectiveRoutes from './objective/objective.routes.js';
import refreshTokenRoutes from './auth/refreshToken.routes.js';
import studentRoutes from './student/student.routes.js';
import teacherLessonHourlyRateRoutes from './teacher-lesson-hourly-rate/teacherLessonHourlyRate.routes.js';
import teacherRoutes from './teacher/teacher.routes.js';

// --- API Route Grouping for Monitoring ---
/**
 * Get logical route group for API endpoints
 * Keep this function close to the route definitions below for easy maintenance
 */
export function getRouteGroup(method: string, url: string): string {
  // Remove query parameters and normalize
  const cleanUrl = url.split('?')[0];
  const route = `${method} ${cleanUrl}`;

  // Declarative route grouping - map specific routes to logical groups
  const routePatterns: Record<string, string> = {
    // Authentication
    'POST /api/v1/auth/login': '/api/v1/auth',
    'POST /api/v1/auth/register': '/api/v1/auth',
    'POST /api/v1/auth/logout': '/api/v1/auth',
    'GET /api/v1/refresh-token': '/api/v1/refresh-token',
    'POST /api/v1/refresh-token': '/api/v1/refresh-token',

    // Lessons - main endpoint
    'GET /api/v1/lessons': '/api/v1/lessons',
    'POST /api/v1/lessons': '/api/v1/lessons',
    'GET /api/v1/lessons/{id}': '/api/v1/lessons',
    'PATCH /api/v1/lessons/{id}': '/api/v1/lessons',

    // Lesson Requests
    'GET /api/v1/lesson-requests': '/api/v1/lesson-requests',
    'POST /api/v1/lesson-requests': '/api/v1/lesson-requests',
    'GET /api/v1/lesson-requests/{id}': '/api/v1/lesson-requests',

    // Lesson Quotes  
    'GET /api/v1/lesson-quotes': '/api/v1/lesson-quotes',
    'POST /api/v1/lesson-quotes': '/api/v1/lesson-quotes',
    'PATCH /api/v1/lesson-quotes': '/api/v1/lesson-quotes',
    'GET /api/v1/lesson-quotes/{id}': '/api/v1/lesson-quotes',

    // Lesson Plans
    'GET /api/v1/lesson-plans': '/api/v1/lesson-plans',
    'POST /api/v1/lesson-plans': '/api/v1/lesson-plans',
    'GET /api/v1/lesson-plans/{id}': '/api/v1/lesson-plans',

    // Summary
    'GET /api/v1/summary': '/api/v1/summary',
    'POST /api/v1/summary': '/api/v1/summary',
    'GET /api/v1/summary/{id}': '/api/v1/summary',

    // Users
    'GET /api/v1/students': '/api/v1/students',
    'POST /api/v1/students': '/api/v1/students',
    'GET /api/v1/students/{id}': '/api/v1/students',
    'GET /api/v1/teachers': '/api/v1/teachers',
    'POST /api/v1/teachers': '/api/v1/teachers',
    'GET /api/v1/teachers/{id}': '/api/v1/teachers',

    // Other endpoints
    'GET /api/v1/addresses': '/api/v1/addresses',
    'POST /api/v1/addresses': '/api/v1/addresses',
    'GET /api/v1/health': '/api/v1/health',
    'POST /api/v1/logs': '/api/v1/logs',
    'GET /api/v1/milestones': '/api/v1/milestones',
    'POST /api/v1/milestones': '/api/v1/milestones',
    'GET /api/v1/objectives': '/api/v1/objectives',
    'POST /api/v1/objectives': '/api/v1/objectives',
    'GET /api/v1/teacher-lesson-rates': '/api/v1/teacher-lesson-rates',
    'POST /api/v1/teacher-lesson-rates': '/api/v1/teacher-lesson-rates',
    'PATCH /api/v1/teacher-lesson-rates': '/api/v1/teacher-lesson-rates'
  };

  // Check for exact matches first
  if (routePatterns[route]) {
    return routePatterns[route];
  }

  // Check for pattern matches with IDs and query parameters
  for (const [pattern, group] of Object.entries(routePatterns)) {
    const [patternMethod, patternPath] = pattern.split(' ');
    if (method === patternMethod && cleanUrl.startsWith(patternPath.replace('/{id}', ''))) {
      // Handle routes with IDs (e.g., /api/v1/lessons/123 -> /api/v1/lessons)
      const basePath = patternPath.replace('/{id}', '');
      if (cleanUrl === basePath ||
        cleanUrl.match(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/[^/]+)*$`))) {
        return group;
      }
    }
  }

  // Log unmatched routes for monitoring
  if (cleanUrl.startsWith('/api/v1/') && !global._httpLoggerDebugLogged) {
    console.warn(`🚨 Unmatched API route: ${route}`);
    (global as any)._httpLoggerDebugLogged = true;
  }

  // Default: use just the clean URL (no method prefix)
  return cleanUrl;
}

// --- Express App Setup --- 
const app: Express = express();

// Core Middleware
app.use(helmet());
// Only use compression in non-development environments
if (process.env.NODE_ENV !== 'development') {
  app.use(compression());
}

// Response time tracking middleware (must be before HTTP logger)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Override the end method to calculate response time before sending
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
    const responseTime = Date.now() - start;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    return originalEnd(chunk, encoding, cb);
  };

  next();
});

// HTTP Request Logging (replaces Morgan)
app.use(httpLogger);

// CORS Middleware
const allowedOrigins = frontendUrl.split(',').map(url => url.trim()).filter(url => url);
if (isDebugMode) {
  logger.debug({ allowedOrigins }, 'CORS allowed origins');
}
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn({ origin }, 'Origin not allowed by CORS');
      callback(null, true); // Still allow for now, but log a warning
    }
  },
  credentials: true, // Allow cookies to be sent with requests
}));

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/logs', loggerRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/lesson-plans', lessonPlanRoutes);
app.use('/api/v1/lesson-quotes', lessonQuoteRoutes);
app.use('/api/v1/lesson-requests', lessonRequestRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/summary', lessonSummaryRoutes);
app.use('/api/v1/milestones', milestoneRoutes);
app.use('/api/v1/objectives', objectiveRoutes);
app.use('/api/v1/refresh-token', refreshTokenRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teacher-lesson-rates', teacherLessonHourlyRateRoutes);
app.use('/api/v1/teachers', teacherRoutes);

// --- Global Error Handling ---
// This MUST be the last `app.use()`
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Use Pino's standard serializers to safely log the request and error
  logger.error({ err, req }, 'An unhandled error occurred');

  // Default to 500 Internal Server Error
  let statusCode = 500;
  let errorMessage = 'An internal server error occurred.';

  if (err instanceof AppError) {
    statusCode = err.status;
    errorMessage = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    // Format Zod errors for a more helpful response
    errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  }

  // Avoid sending response if one has already been sent
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// --- Start Server Logic --- 
async function startServer() {
  try {
    // Ensure database is connected BEFORE starting the listener
    await testDatabaseConnection();

    app.listen(PORT, () => {
      if (process.env.NODE_ENV === 'development') {
        logger.info('✅ Server ready and listening');
        logger.info(`🌐 API available at: http://localhost:${PORT}`);
        logger.info(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
        logger.info(`📝 All API requests will be logged at INFO level`);
      } else {
        logger.info({ port: PORT, environment: process.env.NODE_ENV }, 'Server running');
      }
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1); // Exit if server fails to start (e.g., DB connection failed initially)
  }
}

// --- Graceful Shutdown Logic --- 
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal. Shutting down gracefully...');
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    // Add any other cleanup tasks here (e.g., closing message queues)
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
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