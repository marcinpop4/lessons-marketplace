import express from 'express';
import { lessonRequestController } from '../controllers/lessonRequestController.js';

const router = express.Router();

// Create a new lesson request
router.post('/', lessonRequestController.createLessonRequest);

// Get a lesson request by ID
router.get('/:id', lessonRequestController.getLessonRequestById);

// Get all lesson requests for a student
router.get('/student/:studentId', lessonRequestController.getLessonRequestsByStudent);

export default router; 