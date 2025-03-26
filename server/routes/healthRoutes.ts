import express from 'express';

const router = express.Router();

/**
 * Health check endpoint
 * Returns 200 OK status to indicate server is running
 * @route GET /api/health
 * @access Public
 */
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

export default router; 