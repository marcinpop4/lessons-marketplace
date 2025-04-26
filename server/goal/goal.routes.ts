import express, { Router } from 'express';
import { goalController } from './goal.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '@shared/models/UserType';

const router: Router = express.Router();

// --- Goal Routes ---

// GET /api/v1/goals?lessonId=... - Get goals for a specific lesson (Student/Teacher involved - service handles auth)
router.get('/', authMiddleware, goalController.getGoalsByLessonId);

// POST /api/v1/goals - Create a new goal (Teacher only - requires service auth check too)
router.post('/', authMiddleware, checkRole([UserType.TEACHER]), goalController.createGoal);

// GET /api/v1/goals/:goalId - Get a specific goal by ID (Student/Teacher involved - service handles auth)
router.get('/:goalId', authMiddleware, goalController.getGoalById);

// PATCH /api/v1/goals/:goalId - Update the status of a specific goal (Teacher only - requires service auth check too)
router.patch('/:goalId', authMiddleware, checkRole([UserType.TEACHER]), goalController.updateGoalStatus);

// Generate AI recommendations for goals (Teacher only)
router.post('/recommendations/generate', authMiddleware, checkRole([UserType.TEACHER]), goalController.generateRecommendations);

// Streaming Route (Teacher only)
router.get('/recommendations/stream', authMiddleware, checkRole([UserType.TEACHER]), goalController.streamRecommendations);

export default router; 