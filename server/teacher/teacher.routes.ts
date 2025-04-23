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

// GET /api/teachers/stats - Get teacher statistics
router.get('/stats', authMiddleware, checkRole(['TEACHER']), teacherController.getTeacherStats);

// GET /api/teachers/:teacherId/lessons - Get all lessons for a specific teacher
// Requires authentication, authorization handled in controller/service
router.get('/:teacherId/lessons', authMiddleware, teacherController.getTeacherLessons);

// GET /api/v1/teachers/:teacherId/lessons/:lessonId/goals
router.get('/:teacherId/lessons/:lessonId/goals', authMiddleware, teacherController.getLessonGoals);

export default router; 