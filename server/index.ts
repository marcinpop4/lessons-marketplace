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
import { AppError } from './errors/index.js'; // Import base error
// Import ZodError
import { ZodError } from 'zod';

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
import refreshTokenRoutes from './auth/refreshToken.routes.js';
import lessonQuoteRoutes from './lessonQuote/lessonQuote.routes.js';
import addressRoutes from './address/address.routes.js';
import healthRoutes from './health/health.routes.js';
import studentRoutes from './student/student.routes.js';
import teacherLessonHourlyRateRoutes from './teacher-lesson-hourly-rate/teacherLessonHourlyRate.routes.js'; // Updated import
import objectiveRoutes from './objective/objective.routes.js';

// --- Express App Setup --- 
const app: Express = express();

// Core Middleware
app.use(helmet());
// Only use compression in non-development environments
if (process.env.NODE_ENV !== 'development') {
  app.use(compression());
}

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

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/refresh-token', refreshTokenRoutes);
app.use('/api/v1/lesson-requests', lessonRequestRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/lesson-quotes', lessonQuoteRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teacher-lesson-rates', teacherLessonHourlyRateRoutes);
app.use('/api/v1/objectives', objectiveRoutes);

// --- Error Handling --- 
app.use((err: Error | any, req: Request, res: Response, next: NextFunction) => {
  // Log detailed error information
  console.error('[GLOBAL ERROR HANDLER] Caught error:');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);

  let statusCode = 500; // Default to 500
  let errorMessage = 'Something went wrong!';
  let errorDetails = undefined; // For Zod errors
  let errorStack = undefined;

  // Log different properties depending on the error type
  if (err instanceof ZodError) {
    // Handle Zod validation errors
    statusCode = 400; // Bad Request
    // Use the first Zod issue to create a more specific main error message
    const firstIssue = err.errors[0];
    errorMessage = `Validation failed: ${firstIssue.message} at path [${firstIssue.path.join('.')}]`;
    errorDetails = err.errors; // Extract detailed issues from ZodError
    console.error('Zod Validation Error:', JSON.stringify(errorDetails, null, 2));
    // No stack needed for typical validation errors
  } else if (err instanceof Error) {
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    errorMessage = err.message; // Use the error's message
    errorStack = err.stack;

    // Check if it's an instance of our custom AppError or its subclasses
    if ('status' in err && typeof (err as any).status === 'number') {
      statusCode = (err as any).status;
      console.error(`Error has status property: ${statusCode}`);
    } else if (err instanceof AppError) {
      statusCode = err.status;
      console.error(`Error is instance of AppError, status: ${statusCode}`);
    } else {
      console.error('Error is a generic Error, defaulting to 500.');
    }
  } else {
    // Log non-Error objects as best as possible
    console.error('Caught non-Error object:', err);
  }

  // Ensure response status is set
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: errorMessage,
      // Include Zod details if present
      details: errorDetails,
      // Optionally include stack in development for non-Zod errors
      stack: process.env.NODE_ENV === 'development' && !errorDetails ? errorStack : undefined
    });
  } else {
    console.error('[GLOBAL ERROR HANDLER] Headers already sent, cannot send JSON error response.');
    next(err);
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