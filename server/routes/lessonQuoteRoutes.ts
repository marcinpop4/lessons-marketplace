import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { checkRole } from '../middleware/auth/roleMiddleware.js';
import { lessonQuoteController } from '../controllers/lessonQuoteController.js';

const router: Router = express.Router();

// Create quotes for a lesson request
router.post('/create-quotes', authMiddleware, checkRole(['STUDENT']), lessonQuoteController.createLessonQuotes);

// Get quotes for a lesson request
router.get('/request/:lessonRequestId', authMiddleware, lessonQuoteController.getLessonQuotesByRequestId);

// Accept a lesson quote (Requires student role)
router.post('/:quoteId/accept', authMiddleware, checkRole(['STUDENT']), lessonQuoteController.acceptQuote);

export default router; 