import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import logger from './utils/logger.js';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

// Load database configuration (must be before importing prisma)
import './config/database.js';

// Import prisma client
import prisma from './prisma.js';

// Import routes
import lessonRequestRoutes from './routes/lessonRequestRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import authRoutes from './routes/auth/authRoutes.js';
import lessonQuoteRoutes from './routes/lessonQuoteRoutes.js';
import addressRoutes from './routes/addressRoutes.js';

// Initialize express app
const app = express();

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
  logger.info('Generating Prisma client...');
  execSync('npx prisma generate --schema=server/prisma/schema.prisma', { stdio: 'inherit' });
  logger.info('Prisma client generated successfully');
} catch (error) {
  logger.error('Failed to generate Prisma client:', error);
  // Continue anyway - the client might already be generated
  logger.warn('Continuing despite Prisma generation error');
}

// Verify database connection before starting server
(async function testDatabaseConnection() {
  try {
    logger.info('Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    // In CI/production, exit on database connection failure
    if (process.env.NODE_ENV === 'production' || process.env.profile === 'ci') {
      logger.error('Exiting due to database connection failure');
      process.exit(1);
    } else {
      logger.warn('Continuing despite database connection failure');
    }
  }
})();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses

// Configure logging based on environment variables
// Use a simple format by default and a more detailed one when DEBUG=true
const isDebugMode = process.env.DEBUG === 'true';
if (isDebugMode) {
  app.use(morgan('combined')); // Detailed logs for debugging
  logger.info('Debug mode: Verbose logging enabled');
} else {
  // Use a minimal format for regular operation
  app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
}

// Enhanced CORS configuration using only environment variables
const allowedOrigins = frontendUrl.split(',').map(url => url.trim()).filter(url => url);

// Log the allowed origins for debugging
if (isDebugMode) {
  logger.debug('CORS allowed origins:', allowedOrigins);
}

app.use(cors({ 
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // Still allow for now, but log a warning
    }
  },
  credentials: true, // Allow cookies to be sent with requests
})); 
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request body
app.use(cookieParser()); // Parse cookies

// Enhanced database health check with retry mechanism
app.get('/api/health', async (req, res) => {
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
      
      return res.status(200).json({ 
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
    } catch (error) {
      lastError = error;
      logger.error(`Database connection error (attempt ${attempt}/${maxRetries}):`, error);
      
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
  
  return res.status(500).json({ 
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

// API documentation for root route
app.get('/', (req, res) => {
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
  logger.error(err.stack || err.message || 'Unknown error');
  res.status(500).send({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
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