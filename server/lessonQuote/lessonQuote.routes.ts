import express, { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { lessonQuoteController } from './lessonQuote.controller.js';

const router: Router = express.Router();

// Create quotes for a lesson request
router.post('/create-quotes', authMiddleware, checkRole(['STUDENT']), lessonQuoteController.createLessonQuotes);

// Get quotes for a lesson request
router.get('/request/:lessonRequestId', authMiddleware, lessonQuoteController.getLessonQuotesByRequestId);

// Accept a lesson quote (Requires student role)
router.post('/:quoteId/accept', authMiddleware, checkRole(['STUDENT']), lessonQuoteController.acceptQuote);

export default router; 