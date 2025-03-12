import express from 'express';
import { getLessonQuotesByRequestId, acceptLessonQuote } from '../controllers/lessonQuoteController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Get quotes for a lesson request
router.get('/request/:lessonRequestId', authenticateJWT, getLessonQuotesByRequestId);

// Accept a quote
router.post('/:quoteId/accept', authenticateJWT, acceptLessonQuote);

export default router; 