import express, { Router } from 'express';
import { lessonController } from './lesson.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

// GET /api/v1/lessons?teacherId=... OR ?quoteId=... 
// Fetches lessons filtered by teacher (Teacher only) OR by quote (Student/Teacher of quote)
// Removed checkRole middleware - Auth handled in controller/service
router.get('/', authMiddleware, lessonController.getLessons as any);

// Create a new lesson
// Requires authentication (typically student accepting a quote)
router.post('/', authMiddleware, lessonController.createLesson);

// Get a lesson by ID
router.get('/:id', authMiddleware, lessonController.getLessonById);

// Update lesson status (Teacher only)
router.patch('/:lessonId', authMiddleware, checkRole([UserType.TEACHER]), lessonController.updateLessonStatus);

export default router; 