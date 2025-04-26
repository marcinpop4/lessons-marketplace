import express, { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { lessonQuoteController } from './lessonQuote.controller.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

// POST /api/v1/lesson-quotes - Create a quote for a lesson request (Teacher only)
router.post('/', authMiddleware, checkRole([UserType.TEACHER]), lessonQuoteController.createLessonQuote);

// GET /api/v1/lesson-quotes - Get quotes (filtered by query params) (Student or Teacher)
router.get('/', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), lessonQuoteController.getLessonQuotes);

// PATCH /api/v1/lesson-quotes/:quoteId - Update a quote's status (Student accepts/rejects, Teacher withdraws/modifies)
router.patch('/:quoteId', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), lessonQuoteController.updateLessonQuoteStatus);

export default router; 