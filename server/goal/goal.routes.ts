import express, { Router } from 'express';
import { goalController } from './goal.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '@shared/models/UserType';

const router: Router = express.Router();

// --- Goal Routes ---

/**
 * @openapi
 * /goals:
 *   get:
 *     summary: Get goals for a specific lesson
 *     description: Retrieves all goals associated with a given lesson ID. Accessible by both students and teachers involved in the lesson.
 *     tags:
 *       - Goals
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: lessonId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the lesson to get goals for
 *     responses:
 *       '200':
 *         description: List of goals for the lesson
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Goal'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User not associated with this lesson
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, goalController.getGoalsByLessonId);

/**
 * @openapi
 * /goals:
 *   post:
 *     summary: Create a new goal
 *     description: Creates a new goal for a lesson. Accessible only by teachers.
 *     tags:
 *       - Goals
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lessonId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               estimatedLessonCount:
 *                 type: integer
 *                 minimum: 1
 *             required:
 *               - lessonId
 *               - title
 *               - description
 *               - estimatedLessonCount
 *     responses:
 *       '201':
 *         description: Goal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Goal'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User is not a teacher or not associated with this lesson
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, checkRole([UserType.TEACHER]), goalController.createGoal);

/**
 * @openapi
 * /goals/{goalId}:
 *   get:
 *     summary: Get a goal by ID
 *     description: Retrieves a specific goal by its ID. Accessible by students and teachers involved in the associated lesson.
 *     tags:
 *       - Goals
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: goalId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Goal details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Goal'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User not associated with this goal's lesson
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:goalId', authMiddleware, goalController.getGoalById);

/**
 * @openapi
 * /goals/{goalId}:
 *   patch:
 *     summary: Update the status of a goal
 *     description: Updates the status of a specific goal. Only accessible by teachers associated with the goal's lesson.
 *     tags:
 *       - Goals
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: goalId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transition:
 *                 $ref: '#/components/schemas/GoalStatusTransition'
 *               context:
 *                 type: object
 *                 nullable: true
 *                 description: Optional context for the status change
 *             required:
 *               - transition
 *     responses:
 *       '200':
 *         description: Goal status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Goal'
 *       '400':
 *         description: Bad request (invalid transition)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User is not a teacher or not associated with this goal's lesson
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Goal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:goalId', authMiddleware, checkRole([UserType.TEACHER]), goalController.updateGoalStatus);

/**
 * @openapi
 * /goals/recommendations/generate:
 *   post:
 *     summary: Generate AI recommendations for goals
 *     description: Generates AI-powered recommendations for goals based on provided lesson details. Only accessible by teachers.
 *     tags:
 *       - Goals
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lessonType:
 *                 $ref: '#/components/schemas/LessonType'
 *               studentLevel:
 *                 type: string
 *                 description: The level of the student (e.g., beginner, intermediate, advanced)
 *               studentInterests:
 *                 type: string
 *                 description: Description of student interests to tailor recommendations
 *               currentGoals:
 *                 type: string
 *                 description: Optional description of current goals to build upon
 *             required:
 *               - lessonType
 *               - studentLevel
 *     responses:
 *       '200':
 *         description: Goal recommendations generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   estimatedLessonCount:
 *                     type: integer
 *       '400':
 *         description: Bad request (missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User is not a teacher
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/recommendations/generate', authMiddleware, checkRole([UserType.TEACHER]), goalController.generateRecommendations);

/**
 * @openapi
 * /goals/recommendations/stream:
 *   get:
 *     summary: Stream goal recommendations
 *     description: Streams AI-generated goal recommendations in real-time. Only accessible by teachers.
 *     tags:
 *       - Goals
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: lessonType
 *         in: query
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/LessonType'
 *       - name: studentLevel
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The level of the student (e.g., beginner, intermediate, advanced)
 *       - name: studentInterests
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Description of student interests to tailor recommendations
 *     responses:
 *       '200':
 *         description: Stream of goal recommendations (text/event-stream)
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream containing goal recommendations
 *       '400':
 *         description: Bad request (missing required parameters)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden - User is not a teacher
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recommendations/stream', authMiddleware, checkRole([UserType.TEACHER]), goalController.streamRecommendations);

export default router; 