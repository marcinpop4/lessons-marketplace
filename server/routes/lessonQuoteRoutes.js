import express from 'express';
import { lessonQuoteController } from '../controllers/lessonQuoteController.js';
import { authenticate, isStudent } from '../middleware/auth/authMiddleware.js';
const router = express.Router();
// Create quotes for a lesson request
router.post('/create-quotes', authenticate, isStudent, lessonQuoteController.createLessonQuotes);
// Get quotes for a lesson request
router.get('/request/:lessonRequestId', authenticate, lessonQuoteController.getLessonQuotesByRequestId);
export default router;
