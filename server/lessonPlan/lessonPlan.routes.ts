import express, { Router } from 'express';
import { lessonPlanController } from './lessonPlan.controller.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { checkRole } from '../auth/role.middleware.js';
import { UserType } from '../../shared/models/UserType.js'; // For checkRole

const router: Router = express.Router();

/**
 * @openapi
 * /lesson-plans:
 *   post:
 *     summary: Create a new lesson plan
 *     description: Allows an authenticated teacher to create a new lesson plan associated with a specific lesson (ID provided in body).
 *     tags:
 *       - Lesson Plans
 *     security:
 *       - BearerAuth: []
 *     parameters: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLessonPlanDto' 
 *           example: # Added example based on CreateLessonPlanDto
 *             lessonId: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *             title: "Beginner Guitar Techniques"
 *             description: "Focus on basic chords, strumming patterns, and fingerpicking."
 *             dueDate: "2024-12-31T11:00:00Z"
 *     responses:
 *       '201':
 *         description: Lesson plan created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonPlan'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         description: Lesson not found (referenced by lessonId in body).
 */
router.post(
    '/',
    authMiddleware,
    checkRole([UserType.TEACHER]),
    lessonPlanController.createLessonPlan
);

/**
 * @openapi
 * /lesson-plans/{lessonPlanId}:
 *   get:
 *     summary: Get a lesson plan by ID
 *     description: Retrieves a specific lesson plan by its ID. Accessible by the teacher or student associated with the lesson plan.
 *     tags:
 *       - Lesson Plans
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonPlanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the lesson plan to retrieve.
 *     responses:
 *       '200':
 *         description: Lesson plan details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonPlan'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
    '/:lessonPlanId',
    authMiddleware,
    lessonPlanController.getLessonPlanById
);

/**
 * @openapi
 * /lesson-plans:
 *   get:
 *     summary: Get lesson plans for the authenticated user
 *     description: Retrieves lesson plans for the currently authenticated user. Teachers see plans they created; students see plans for their lessons.
 *     tags:
 *       - Lesson Plans
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of lesson plans.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LessonPlan'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
    '/',
    authMiddleware,
    lessonPlanController.getLessonPlansForUser
);

/**
 * @openapi
 * /lesson-plans:
 *   patch:
 *     summary: Update the status of a lesson plan
 *     description: Updates the status of a specific lesson plan (ID provided in body). Allows authorized users (typically teacher) to perform status transitions.
 *     tags:
 *       - Lesson Plans
 *     security:
 *       - BearerAuth: []
 *     parameters: [] # No path parameters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateLessonPlanStatusDto' # DTO now includes lessonPlanId
 *     responses:
 *       '200':
 *         description: Lesson plan status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LessonPlan'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError' 
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */
router.patch(
    '/',
    authMiddleware,
    lessonPlanController.updateLessonPlanStatus
);

export default router; 