import express, { Router } from 'express';
import { studentController } from './student.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

router.post('/', authMiddleware, checkRole([UserType.STUDENT]), studentController.createStudent);
router.get('/:id', authMiddleware, checkRole([UserType.STUDENT, UserType.TEACHER]), studentController.getStudentById);

// Add other student routes here (e.g., GET /:id if needed, likely authenticated)

export default router; 