import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

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

// Initialize express app
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging

// Enhanced CORS configuration using only environment variables
const frontendUrl = process.env.FRONTEND_URL || '';
const allowedOrigins = frontendUrl.split(',').map(url => url.trim()).filter(url => url);

// Log the allowed origins for debugging
console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({ 
  origin: function(origin, callback) {
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

// Database connection test
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error: unknown) {
    console.error('Database connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    res.status(500).json({ status: 'error', database: 'disconnected', error: errorMessage });
  }
});

// API routes with versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lesson-requests', lessonRequestRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/lesson-quotes', lessonQuoteRoutes);

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
      '/api/v1/lesson-quotes': 'Lesson quotes endpoints (v1)'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
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