import express, { Router } from 'express';
import { milestoneController } from './milestone.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js';

const router: Router = express.Router();

/**
 * @openapi
 * /milestones:
 *   post:
 *     summary: Create a new milestone
 *     description: Allows an authenticated teacher to create a new milestone for a specific lesson plan.
 *     tags:
 *       - Milestones
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMilestoneDto'
 *           example:
 *             lessonPlanId: "plan-uuid-123"
 *             title: "Master G Major Scale"
 *             description: "Practice scale patterns in all positions."
 *             dueDate: "2024-10-15T23:59:59Z"
 *     responses:
 *       '201':
 *         description: Milestone created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Milestone'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         description: Lesson plan not found. # Or other relevant resource not found for creation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 */
router.post(
    '/',
    authMiddleware,
    checkRole([UserType.TEACHER]), // Only teachers create milestones
    milestoneController.createMilestone
);

/**
 * @openapi
 * /milestones:
 *   get:
 *     summary: Get milestones
 *     description: Retrieves milestones. Can be filtered by lessonPlanId. Accessible by authenticated users (specific access control in service layer).
 *     tags:
 *       - Milestones
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lessonPlanId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional ID of the lesson plan to filter milestones by.
 *     responses:
 *       '200':
 *         description: A list of milestones.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Milestone'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError' # e.g. invalid UUID format for lessonPlanId
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       # 403 (Forbidden) can be handled by service if user shouldn't see any milestones
 *       # or if they try to filter by a lessonPlanId they don't have access to.
 *       # 404 could be used if filtering by a non-existent lessonPlanId should yield an error,
 *       # but typically returning an empty list is preferred for filters.
 */
router.get(
    '/',
    authMiddleware,
    milestoneController.getMilestones // New controller method
);

/**
 * @openapi
 * /milestones/{milestoneId}:
 *   get:
 *     summary: Get a milestone by ID
 *     description: Retrieves a specific milestone by its ID. Accessible by the teacher or student associated with the milestone's lesson plan.
 *     tags:
 *       - Milestones
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the milestone to retrieve.
 *     responses:
 *       '200':
 *         description: Milestone details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Milestone'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError' # Milestone not found
 */
router.get(
    '/:milestoneId',
    authMiddleware,
    milestoneController.getMilestoneById
);

/**
 * @openapi
 * /milestones:
 *   patch:
 *     summary: Update the status of a milestone
 *     description: Updates the status of a specific milestone (ID provided in body). Allows authorized users (typically teacher) to perform status transitions.
 *     tags:
 *       - Milestones
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMilestoneStatusDto'
 *           example:
 *             milestoneId: "milestone-uuid-456"
 *             transition: "START_PROGRESS"
 *             context: { notes: "Student started working on scale patterns." }
 *     responses:
 *       '200':
 *         description: Milestone status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Milestone'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError' # Milestone or related entity not found
 */
router.patch(
    '/',
    authMiddleware,
    milestoneController.updateMilestoneStatus
);

export default router; 