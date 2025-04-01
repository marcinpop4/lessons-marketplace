import express, { Router } from 'express';
import { lessonController } from '../controllers/lessonController.js';

const router: Router = express.Router();

// Create a new lesson
router.post('/', lessonController.createLesson);

// Get lessons by quote ID
// This route must come before the general /:id route to avoid being treated as an ID
router.get('/quote/:quoteId', lessonController.getLessonsByQuoteId);

// Get a lesson by ID
router.get('/:id', lessonController.getLessonById);

export default router; 