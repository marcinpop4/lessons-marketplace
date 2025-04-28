import { Router } from 'express';
import { objectiveController } from './objective.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router = Router();

// Middleware to ensure user is an authenticated student for all objective routes
// const requireStudent = [authMiddleware, checkRole([UserType.STUDENT])];

/**
 * @swagger
 * /api/v1/objectives:
 *   get:
 *     tags: [Objectives]
 *     summary: Fetch objectives for a specific student
 *     description: Retrieves a list of learning objectives for the specified student ID. Requires authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: studentId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the student whose objectives are to be fetched.
 *       - name: lessonType
 *         in: query
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/LessonType'
 *         description: Optional lesson type to filter objectives by.
 *       - name: status
 *         in: query
 *         required: false
 *         style: form
 *         explode: false # Use comma-separated for array
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ObjectiveStatusValue'
 *         description: Optional objective statuses to filter by (e.g., status=CREATED,IN_PROGRESS).
 *     responses:
 *       200:
 *         description: List of student objectives.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Objective'
 *       400:
 *         description: Bad Request - Missing or invalid studentId, or invalid filter parameters.
 *       401:
 *         description: Unauthorized - User not authenticated.
 */
router.get('/', authMiddleware, objectiveController.getObjectives);

/**
 * @swagger
 * /api/v1/objectives:
 *   post:
 *     tags: [Objectives]
 *     summary: Create a new objective for the authenticated student
 *     description: Creates a new learning objective for the currently authenticated student. The student ID is inferred from the authentication token.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               lessonType:
 *                 $ref: '#/components/schemas/LessonType'
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *             required:
 *               - title
 *               - description
 *               - lessonType
 *               - targetDate
 *     responses:
 *       201:
 *         description: Objective created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Objective'
 *       400:
 *         description: Bad Request - Invalid input data.
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       403:
 *         description: Forbidden - User is not a student.
 */
router.post('/', authMiddleware, objectiveController.createObjective);

/**
 * @swagger
 * /api/v1/objectives/{objectiveId}:
 *   patch:
 *     tags: [Objectives]
 *     summary: Update the status of an objective
 *     description: Updates the status of a specific learning objective belonging to the authenticated student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the objective to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/ObjectiveStatusValue'
 *               context:
 *                 type: object
 *                 nullable: true
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Objective status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Objective'
 *       400:
 *         description: Bad Request - Invalid input data (e.g., invalid status, invalid transition).
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       403:
 *         description: Forbidden - User is not a student or objective does not belong to them.
 *       404:
 *         description: Not Found - Objective with the given ID not found.
 */
router.patch('/:objectiveId', authMiddleware, objectiveController.updateObjectiveStatus);

// --- AI Recommendation Route ---

/**
 * @openapi
 * /api/v1/objectives/recommendations/stream:
 *   get:
 *     tags: [Objectives]
 *     summary: Stream AI-generated objective recommendations
 *     description: Streams AI-powered learning objective recommendations tailored to the authenticated student, optionally filtered by lesson type.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: lessonType
 *         in: query
 *         required: false
 *         schema:
 *           $ref: '#/components/schemas/LessonType'
 *         description: Optional lesson type to focus recommendations on.
 *       - name: count
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 10
 *         description: Number of recommendations to generate.
 *     responses:
 *       '200':
 *         description: Stream of objective recommendations (text/event-stream)
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream containing ObjectiveRecommendation objects.
 *       '400':
 *         description: Bad Request (e.g., invalid lessonType or count)
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
 *         description: Forbidden - User is not a student
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/recommendations/stream', authMiddleware, objectiveController.streamRecommendations);

export default router; 