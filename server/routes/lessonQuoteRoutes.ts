import express from 'express';
import { lessonQuoteController } from '../controllers/lessonQuoteController.js';

const router = express.Router();

// Create a new lesson quote
router.post('/', lessonQuoteController.createLessonQuote);

// Get a lesson quote by ID
router.get('/:id', lessonQuoteController.getLessonQuoteById);

// Get all lesson quotes for a lesson request
router.get('/request/:lessonRequestId', lessonQuoteController.getLessonQuotesByLessonRequest);

export default router; 