import express, { Router } from 'express';
import { lessonQuoteController } from '../controllers/lessonQuoteController.js';
import { authenticate, isStudent } from '../middleware/auth/authMiddleware.js';

const router: Router = express.Router();

// Create a new lesson quote
router.post('/', authenticate, lessonQuoteController.createLessonQuote);

// Get a lesson quote by ID
router.get('/:id', authenticate, lessonQuoteController.getLessonQuoteById);

// Get quotes for a lesson request
router.get('/request/:lessonRequestId', authenticate, lessonQuoteController.getLessonQuotesByRequestId);

// Accept a quote
router.post('/:quoteId/accept', authenticate, isStudent, lessonQuoteController.acceptLessonQuote);

export default router; 