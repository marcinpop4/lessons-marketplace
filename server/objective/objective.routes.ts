import { Router } from 'express';
import { objectiveController } from './objective.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router = Router();

// Middleware to ensure user is an authenticated student for all objective routes
const requireStudent = [authMiddleware, checkRole([UserType.STUDENT])];

/**
 * @swagger
 * /api/v1/objectives:
 *   get:
 *     tags: [Objectives]
 *     summary: Fetch objectives for the authenticated student
 *     description: Retrieves a list of learning objectives associated with the currently authenticated student.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of student objectives.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Objective' # TODO: Verify shared model path/name
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       403:
 *         description: Forbidden - User is not a student.
 */
router.get('/', requireStudent, objectiveController.getObjectives);

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
 *             $ref: '#/components/schemas/ObjectiveCreateDTO' # TODO: Define/Import ObjectiveCreateDTO
 *     responses:
 *       201:
 *         description: Objective created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Objective' # TODO: Verify shared model path/name
 *       400:
 *         description: Bad Request - Invalid input data.
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       403:
 *         description: Forbidden - User is not a student.
 */
router.post('/', requireStudent, objectiveController.createObjective);

/**
 * @swagger
 * /api/v1/objectives/{objectiveId}:
 *   patch:
 *     tags: [Objectives]
 *     summary: Update the status of an objective
 *     description: Updates the status (e.g., achieved) of a specific learning objective belonging to the authenticated student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid # Assuming UUIDs, adjust if needed
 *         description: ID of the objective to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ObjectiveUpdateStatusDTO' # TODO: Define/Import ObjectiveUpdateStatusDTO
 *     responses:
 *       200:
 *         description: Objective status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Objective' # TODO: Verify shared model path/name
 *       400:
 *         description: Bad Request - Invalid input data (e.g., invalid status).
 *       401:
 *         description: Unauthorized - User not authenticated.
 *       403:
 *         description: Forbidden - User is not a student or objective does not belong to them.
 *       404:
 *         description: Not Found - Objective with the given ID not found.
 */
router.patch('/:objectiveId', requireStudent, objectiveController.updateObjectiveStatus);

export default router; 