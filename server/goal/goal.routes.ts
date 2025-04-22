import express, { Router } from 'express';
import { goalController } from './goal.controller.js';
import { authMiddleware } from '../auth/authMiddleware.js';
// import { checkRole } from '../auth/roleMiddleware.js'; // Import if role checks are needed later

const router: Router = express.Router();

// --- Goal Routes ---

// Create a new goal (requires authentication)
// POST /api/v1/goals (body: { lessonId: string, description: string })
router.post('/', authMiddleware, goalController.createGoal);

// Get a specific goal by ID (requires authentication)
// GET /api/v1/goals/:goalId
router.get('/:goalId', authMiddleware, goalController.getGoalById);

// Update the status of a specific goal (requires authentication)
// PATCH /api/v1/goals/:goalId (body: { transition: GoalStatusTransition, context?: any })
router.patch('/:goalId', authMiddleware, /* checkRole(...), */ goalController.updateGoalStatus);

// --- Lesson-Specific Goal Routes ---
// Note: These are nested under lessons for clarity, e.g., /api/v1/lessons/:lessonId/goals

// Get all goals for a specific lesson (requires authentication)
// GET /api/v1/lessons/:lessonId/goals
// We need a separate router instance for lesson-related routes to mount this correctly.
// This will be handled in the main server file or a lesson-specific router.

export default router; 