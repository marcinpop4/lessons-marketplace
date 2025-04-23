import express, { Router } from 'express';
import { teacherLessonHourlyRateController } from './teacherLessonHourlyRate.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';

const router: Router = express.Router();

// All routes in this file require TEACHER role
router.use(authMiddleware);
router.use(checkRole(['TEACHER']));

// POST /api/v1/teacher-lesson-rates - Create or update a lesson rate
router.post('/', teacherLessonHourlyRateController.createOrUpdate);

// POST /api/v1/teacher-lesson-rates/:rateId/deactivate - Deactivate a lesson rate
router.post('/:rateId/deactivate', teacherLessonHourlyRateController.deactivate);

// POST /api/v1/teacher-lesson-rates/:rateId/reactivate - Reactivate a lesson rate
router.post('/:rateId/reactivate', teacherLessonHourlyRateController.reactivate);

export default router; 