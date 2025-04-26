import express, { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { lessonQuoteController } from './lessonQuote.controller.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

// Create quotes for a lesson request (Student only)
router.post('/create-quotes', authMiddleware, checkRole([UserType.STUDENT]), lessonQuoteController.createLessonQuotes);

// Get quotes for a lesson request (Any authenticated user)
router.get('/request/:lessonRequestId', authMiddleware, lessonQuoteController.getLessonQuotesByRequestId);

// Accept a quote (Student only)
router.post('/:quoteId/accept', authMiddleware, checkRole([UserType.STUDENT]), lessonQuoteController.acceptQuote);

export default router; 