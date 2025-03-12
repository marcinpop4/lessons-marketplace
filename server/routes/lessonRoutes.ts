import express from 'express';
import { lessonController } from '../controllers/lessonController.js';

const router = express.Router();

// Create a new lesson
router.post('/', lessonController.createLesson);

// Get a lesson by ID
router.get('/:id', lessonController.getLessonById);

export default router; 