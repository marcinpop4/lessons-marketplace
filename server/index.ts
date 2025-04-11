import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { execSync } from 'child_process';

// Temporary debug code to diagnose startup issues
console.log('=== SERVER STARTUP DEBUG ===');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Environment variables (excluding sensitive data):');
Object.keys(process.env)
  .filter(key => !key.includes('PASSWORD') && !key.includes('SECRET') && !key.includes('KEY'))
  .sort()
  .forEach(key => console.log(`${key}: ${process.env[key]}`));

// Load environment variables
dotenv.config();

// Load database configuration (must be before importing prisma)
import './config/database.js';

// Import prisma client
import prisma from './prisma.js';

// Import routes from new feature folders
import lessonRequestRoutes from './lessonRequest/lessonRequest.routes.js';
import teacherRoutes from './teacher/teacher.routes.js';
import lessonRoutes from './lesson/lesson.routes.js';
import authRoutes from './auth/auth.routes.js';
import lessonQuoteRoutes from './lessonQuote/lessonQuote.routes.js';
import addressRoutes from './address/address.routes.js';
import healthRoutes from './health/health.routes.js'; // Added health routes

// Initialize express app
const app: Express = express();

// Get port from environment or default to 3000
const PORT_ENV = process.env.PORT;
if (!PORT_ENV) {
  throw new Error("PORT environment variable is required");
}
const PORT = parseInt(PORT_ENV, 10);

// Get frontend URL from environment
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error("FRONTEND_URL environment variable is required");
}

// Ensure Prisma client is generated
try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate --schema=server/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('Prisma client generated successfully');
} catch (error) {
  console.error('Failed to generate Prisma client:', error);
  // Continue anyway - the client might already be generated
  console.warn('Continuing despite Prisma generation error');
}

// Verify database connection before starting server
(async function testDatabaseConnection() {
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
})();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses

// Configure logging based on environment variables and LOG_LEVEL
const logLevel = parseInt(process.env.LOG_LEVEL || '1', 10);
const isDebugMode = process.env.DEBUG === 'true' || logLevel >= 3;

// Only use morgan HTTP request logger if log level is appropriate
if (logLevel >= 2) { // Only log HTTP requests at INFO level or higher
  if (isDebugMode) {
    app.use(morgan('combined')); // Detailed logs for debugging
    console.log('Debug mode: Verbose logging enabled');
  } else {
    // Use a minimal format for regular operation
    app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
  }
}

// Enhanced CORS configuration using only environment variables
const allowedOrigins = frontendUrl.split(',').map(url => url.trim()).filter(url => url);

// Log the allowed origins for debugging
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
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request body
app.use(cookieParser()); // Parse cookies

// Enhanced database health check with retry mechanism
app.get('/api/health', async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
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

// API routes with versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lesson-requests', lessonRequestRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/lesson-quotes', lessonQuoteRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/health', healthRoutes); // Use health routes

// API documentation for root route
app.get('/', (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  res.status(200).json({
    message: 'Lessons Marketplace API Server',
    endpoints: {
      '/api/health': 'Check server health',
      '/api/v1/auth': 'Authentication endpoints (v1)',
      '/api/v1/lesson-requests': 'Lesson request endpoints (v1)',
      '/api/v1/teachers': 'Teacher endpoints (v1)',
      '/api/v1/lessons': 'Lesson endpoints (v1)',
      '/api/v1/lesson-quotes': 'Lesson quotes endpoints (v1)',
      '/api/v1/addresses': 'Address endpoints (v1)'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack || err.message || 'Unknown error');
  res.status(500).send({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app; 