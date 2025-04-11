import express, { Router } from 'express';
import { lessonRequestController } from '../controllers/lessonRequestController.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { checkRole } from '../middleware/auth/roleMiddleware.js';

const router: Router = express.Router();

// Create a new lesson request - requires student authentication
router.post('/', authMiddleware, checkRole(['STUDENT']), lessonRequestController.createLessonRequest);

// Get a lesson request by ID - requires authentication
router.get('/:id', authMiddleware, lessonRequestController.getLessonRequestById);

// Get all lesson requests for a student - requires specific student or teacher authentication
router.get('/student/:studentId', authMiddleware, checkRole(['STUDENT']), lessonRequestController.getLessonRequestsByStudent);

export default router; 