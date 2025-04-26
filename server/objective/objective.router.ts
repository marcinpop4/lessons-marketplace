import { Router } from 'express';
import { objectiveController } from './objective.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router = Router();

// Middleware to ensure user is an authenticated student for all objective routes
const requireStudent = [authMiddleware, checkRole([UserType.STUDENT])];

// GET /api/v1/objectives - Fetch objectives for the authenticated student
// Filtering (e.g., by studentId if an admin needs it) could be done via query param
// but default is to get objectives for the logged-in user.
router.get(
    '/',
    requireStudent,
    objectiveController.getObjectives
);

// POST /api/v1/objectives - Create a new objective for the authenticated student
// Student ID will come from the authenticated user (`req.user.id`)
router.post(
    '/',
    requireStudent,
    objectiveController.createObjective
);

// PATCH /api/v1/objectives/:objectiveId - Update objective status
router.patch(
    '/:objectiveId',
    requireStudent,
    objectiveController.updateObjectiveStatus
);

export default router; 