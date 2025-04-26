import express, { Router } from 'express';
import { teacherController } from './teacher.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

// Public routes
// GET /api/v1/teachers - Get teachers, optionally filtered by lesson type
router.get('/', teacherController.getTeachers);

// Protected routes - Teacher only
// GET /api/v1/teachers/stats - Get teacher statistics 
// IMPORTANT: Define specific paths like '/stats' before parameterized paths like '/:id'
router.get('/stats', authMiddleware, checkRole([UserType.TEACHER]), teacherController.getTeacherStats);

// GET /api/v1/teachers/:id - Get a specific teacher's profile 
// Requires authentication 
router.get('/:id', authMiddleware, teacherController.getTeacherById);

export default router; 