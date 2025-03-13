import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './prisma.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import fs from 'fs';

// Import routes
import lessonRequestRoutes from './routes/lessonRequestRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import authRoutes from './routes/auth/authRoutes.js';
import lessonQuoteRoutes from './routes/lessonQuoteRoutes.js';

// Load environment variables
dotenv.config();

// Get directory path equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : ['http://localhost:3000', 'http://localhost:5173'],
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

// Check if the frontend build directory exists
const frontendDistPath = path.join(__dirname, '../dist/frontend');
const frontendExists = fs.existsSync(frontendDistPath);

// Only serve static files and use the SPA catch-all route if the frontend build exists
if (frontendExists) {
  // Serve static files
  app.use(express.static(frontendDistPath));

  // Catch-all route for SPA (React)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // In development mode, if the frontend is not built, return a helpful message for non-API routes
  app.get('*', (req, res) => {
    // Skip API routes (they're handled above)
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: `API endpoint not found: ${req.path}` });
    }
    
    res.status(200).send(`
      <html>
        <head><title>Lessons Marketplace API Server</title></head>
        <body>
          <h1>Lessons Marketplace API Server</h1>
          <p>This is the backend API server. The frontend is not built or is being served separately.</p>
          <p>In development mode, the frontend is typically served by Vite at <a href="http://localhost:5173">http://localhost:5173</a>.</p>
          <p>Available API endpoints:</p>
          <ul>
            <li>/api/health - Check server health</li>
            <li>/api/auth - Authentication endpoints</li>
            <li>/api/lesson-requests - Lesson request endpoints</li>
            <li>/api/teachers - Teacher endpoints</li>
            <li>/api/lessons - Lesson endpoints</li>
            <li>/api/lesson-quotes - Lesson quotes endpoints</li>
          </ul>
        </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!frontendExists) {
    console.log(`Frontend build not found at ${frontendDistPath}`);
    console.log(`API server running without static file serving`);
  }
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