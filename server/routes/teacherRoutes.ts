import express from 'express';
import { teacherController } from '../controllers/teacherController.js';

const router = express.Router();

// GET /api/teachers - Get teachers, optionally filtered by lesson type
router.get('/', teacherController.getTeachers);

export default router; 