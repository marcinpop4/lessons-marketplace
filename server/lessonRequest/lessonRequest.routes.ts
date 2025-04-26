import express, { Router } from 'express';
import { lessonRequestController } from './lessonRequest.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

// Create a new lesson request - requires student authentication
router.post('/', authMiddleware, checkRole([UserType.STUDENT]), lessonRequestController.createLessonRequest);

// Get a lesson request by ID - requires authentication (Owner Student ONLY)
router.get('/:id', authMiddleware, checkRole([UserType.STUDENT]), lessonRequestController.getLessonRequestById);

// Get all lesson requests for a student - requires specific student or teacher authentication
router.get('/', authMiddleware, checkRole([UserType.STUDENT]), lessonRequestController.getLessonRequestsByStudent);

export default router; 