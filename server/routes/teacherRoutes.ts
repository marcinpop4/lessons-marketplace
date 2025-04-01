import express, { Router } from 'express';
import { teacherController } from '../controllers/teacherController.js';
import { authenticate, isTeacher } from '../middleware/auth/authMiddleware.js';

const router: Router = express.Router();

// Public routes
// GET /api/teachers - Get teachers, optionally filtered by lesson type
router.get('/', teacherController.getTeachers);

// Protected routes - Teacher only
// GET /api/teachers/profile - Get the authenticated teacher's profile
router.get('/profile', authenticate, isTeacher, teacherController.getTeacherProfile);

// POST /api/teachers/lesson-rates - Create or update a lesson rate
router.post('/lesson-rates', authenticate, isTeacher, teacherController.createOrUpdateLessonRate);

// POST /api/teachers/lesson-rates/deactivate - Deactivate a lesson rate
router.post('/lesson-rates/deactivate', authenticate, isTeacher, teacherController.deactivateLessonRate);

// POST /api/teachers/lesson-rates/reactivate - Reactivate a lesson rate
router.post('/lesson-rates/reactivate', authenticate, isTeacher, teacherController.reactivateLessonRate);

// GET /api/teachers/stats - Get teacher statistics
router.get('/stats', authenticate, isTeacher, teacherController.getTeacherStats);

export default router; 