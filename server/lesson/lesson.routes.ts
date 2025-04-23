import express, { Router } from 'express';
import { lessonController } from './lesson.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { goalController } from '../goal/goal.controller.js';

const router: Router = express.Router();

// Create a new lesson
router.post('/', lessonController.createLesson);

// Get lessons by quote ID
// This route must come before the general /:id route to avoid being treated as an ID
router.get('/quote/:quoteId', authMiddleware, lessonController.getLessonsByQuoteId);

// Get goals for a specific lesson (requires authentication)
// GET /api/v1/lessons/:lessonId/goals
router.get('/:lessonId/goals', authMiddleware, goalController.getGoalsByLessonId);

// Get a lesson by ID
router.get('/:id', authMiddleware, lessonController.getLessonById);

// Update lesson status (Teacher only)
router.patch('/:lessonId', authMiddleware, checkRole(['TEACHER']), lessonController.updateLessonStatus);

export default router; 