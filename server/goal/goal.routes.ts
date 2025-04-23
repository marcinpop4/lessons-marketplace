import express, { Router } from 'express';
import { goalController } from './goal.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
// import { checkRole } from '../auth/role.middleware.js'; // Import if role checks are needed later

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
router.patch('/:goalId', authMiddleware, goalController.updateGoalStatus);

// Get all goals for a specific lesson (requires authentication)
// GET /api/v1/goals/lessons/:lessonId/goals
router.get('/lessons/:lessonId/goals', authMiddleware, goalController.getGoalsByLessonId);

// Generate AI recommendations for goals (requires authentication)
// POST /api/v1/goals/recommendations/generate
router.post('/recommendations/generate', authMiddleware, goalController.generateRecommendations);

// === New Streaming Route ===
router.get(
    '/recommendations/stream', // Using GET for event stream
    authMiddleware,
    goalController.streamRecommendations // New controller method
);

export default router; 