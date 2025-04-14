import express, { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js'; // Already has .js

const router: Router = express.Router();

/**
 * Health check endpoint
 * Returns 200 OK status to indicate server is running and database is connected
 * @route GET /api/health
 * @access Public
 */
router.get('/', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Server is running and database is connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Server is running but database connection failed'
    });
  }
});

export default router; 