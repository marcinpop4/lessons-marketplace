import express from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { teacherLessonHourlyRateController } from './teacherLessonHourlyRate.controller.js';
import { UserType } from '../../shared/models/UserType.js';

const router = express.Router();

// All routes require teacher authentication
router.use(authMiddleware);
router.use(checkRole([UserType.TEACHER]));

// Routes
router.post('/', teacherLessonHourlyRateController.createOrUpdate);
// Change route for updating status
router.patch('/:id', teacherLessonHourlyRateController.updateStatus);

export default router; 