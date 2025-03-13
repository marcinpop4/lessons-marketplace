import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import prisma from './prisma.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Import routes
import lessonRequestRoutes from './routes/lessonRequestRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import authRoutes from './routes/auth/authRoutes.js';
import lessonQuoteRoutes from './routes/lessonQuoteRoutes.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/lesson-requests', lessonRequestRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/lesson-quotes', lessonQuoteRoutes);

// API documentation for root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Lessons Marketplace API Server',
    endpoints: {
      '/api/health': 'Check server health',
      '/api/auth': 'Authentication endpoints',
      '/api/lesson-requests': 'Lesson request endpoints',
      '/api/teachers': 'Teacher endpoints',
      '/api/lessons': 'Lesson endpoints',
      '/api/lesson-quotes': 'Lesson quotes endpoints'
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