import express, { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js'; // Already has .js

const router: Router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Checks if the server is running and can connect to the database.
 *     tags:
 *       - Health
 *     responses:
 *       '200':
 *         description: Server is healthy and database connection is successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 timestamp: { type: string, format: date-time }
 *                 message: { type: string }
 *       '500':
 *         description: Server is running but database connection failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: error }
 *                 timestamp: { type: string, format: date-time }
 *                 message: { type: string }
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