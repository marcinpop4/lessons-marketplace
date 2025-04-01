import express, { Router } from 'express';
import { lessonRequestController } from '../controllers/lessonRequestController.js';
import { authenticate, isStudent, isSpecificStudent } from '../middleware/auth/authMiddleware.js';

const router: Router = express.Router();

// Create a new lesson request - requires student authentication
router.post('/', authenticate, isStudent, lessonRequestController.createLessonRequest);

// Get a lesson request by ID - requires authentication
router.get('/:id', authenticate, lessonRequestController.getLessonRequestById);

// Get all lesson requests for a student - requires specific student or teacher authentication
router.get('/student/:studentId', authenticate, isSpecificStudent('studentId'), lessonRequestController.getLessonRequestsByStudent);

export default router; 