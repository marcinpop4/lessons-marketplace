import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './prisma.js';
import dotenv from 'dotenv';

// Import routes
import lessonRequestRoutes from './routes/lessonRequestRoutes.js';

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
app.use(cors()); // Cross-origin resource sharing
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request body

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
app.use('/api/lesson-requests', lessonRequestRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist/frontend')));

// Catch-all route for SPA (React)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/frontend/index.html'));
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
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