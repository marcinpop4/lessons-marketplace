import express, { Router } from 'express';
import { teacherController } from './teacher.controller.js';
import { authMiddleware } from '../auth/authMiddleware.js';
import { checkRole } from '../auth/roleMiddleware.js';

const router: Router = express.Router();

// Public routes
// GET /api/teachers - Get teachers, optionally filtered by lesson type
router.get('/', teacherController.getTeachers);

// Protected routes - Teacher only
// GET /api/teachers/profile - Get the authenticated teacher's profile
router.get('/profile', authMiddleware, checkRole(['TEACHER']), teacherController.getTeacherProfile);

// POST /api/teachers/lesson-rates - Create or update a lesson rate
router.post('/lesson-rates', authMiddleware, checkRole(['TEACHER']), teacherController.createOrUpdateLessonRate);

// POST /api/teachers/lesson-rates/deactivate - Deactivate a lesson rate
router.post('/lesson-rates/deactivate', authMiddleware, checkRole(['TEACHER']), teacherController.deactivateLessonRate);

// POST /api/teachers/lesson-rates/reactivate - Reactivate a lesson rate
router.post('/lesson-rates/reactivate', authMiddleware, checkRole(['TEACHER']), teacherController.reactivateLessonRate);

// GET /api/teachers/stats - Get teacher statistics
router.get('/stats', authMiddleware, checkRole(['TEACHER']), teacherController.getTeacherStats);

export default router; 