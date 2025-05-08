import { Request, Response, NextFunction } from 'express';
import { UserType as PrismaUserType } from '@prisma/client'; // Assuming UserType is needed for req.user
import { LessonPlanService } from './lessonPlan.service.js';
import { CreateLessonPlanDto, UpdateLessonPlanStatusDto } from './lessonPlan.dto.js';
import { AuthorizationError, BadRequestError } from '../errors/index.js';
import prismaClientInstance from '../prisma.js'; // Your Prisma client instance
import { isUuid } from '../utils/validation.utils.js';

// Assuming AuthenticatedRequest is defined similarly to lesson.controller.ts
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        userType: PrismaUserType; // Matches type from @prisma/client
    };
}

// Instantiate the service with the Prisma client
const lessonPlanService = new LessonPlanService(prismaClientInstance);

class LessonPlanController {
    /**
     * POST /plans
     * Create a new lesson plan.
     */
    async createLessonPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const createDto: CreateLessonPlanDto = req.body;
            const actor = req.user;

            if (!actor?.id || !actor?.userType) {
                throw new AuthorizationError('Authentication required.');
            }
            if (!createDto.title || !createDto.description) {
                throw new BadRequestError('Title and description are required in the request body.');
            }

            const lessonPlan = await lessonPlanService.createLessonPlan(
                createDto,
                actor.id,
                actor.userType
            );
            res.status(201).json(lessonPlan);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /lesson-plans/:lessonPlanId
     * Get a specific lesson plan by its ID.
     */
    async getLessonPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { lessonPlanId } = req.params;
            const actor = req.user;

            if (!actor?.id) {
                throw new AuthorizationError('Authentication required.');
            }
            if (!lessonPlanId) {
                throw new BadRequestError('Lesson Plan ID parameter is required.');
            }

            const lessonPlan = await lessonPlanService.getLessonPlanById(lessonPlanId, actor.id);
            // Service throws NotFoundError if not found or ForbiddenError if not authorized, which next(error) will handle.
            res.status(200).json(lessonPlan);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /lesson-plans
     * Get lesson plans for the authenticated user (teacher or student).
     */
    async getLessonPlansForUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const actor = req.user;

            if (!actor?.id || !actor?.userType) {
                throw new AuthorizationError('Authentication required.');
            }

            const lessonPlans = await lessonPlanService.getLessonPlansForUser(actor.id, actor.userType);
            res.status(200).json(lessonPlans);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /lesson-plans
     * Update the status of a lesson plan.
     */
    async updateLessonPlanStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const updateDto: UpdateLessonPlanStatusDto = req.body;
            const actor = req.user;

            if (!actor?.id || !actor?.userType) {
                throw new AuthorizationError('Authentication required.');
            }
            if (!updateDto.lessonPlanId || !updateDto.transition) {
                throw new BadRequestError('Lesson Plan ID and transition are required in the request body.');
            }

            const lessonPlan = await lessonPlanService.updateLessonPlanStatus(
                updateDto,
                actor.id,
                actor.userType
            );
            res.status(200).json(lessonPlan);
        } catch (error) {
            next(error);
        }
    }

    async streamAiLessonPlanRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const teacherId = req.user?.id;
            if (!teacherId) {
                // This should ideally be caught by authMiddleware, but good to double-check
                return next(new BadRequestError('Teacher ID not found in authenticated user.'));
            }

            const { sourceLessonId } = req.query;

            if (!sourceLessonId || typeof sourceLessonId !== 'string' || !isUuid(sourceLessonId)) {
                return next(new BadRequestError('Valid sourceLessonId query parameter is required.'));
            }

            // Delegate to the service layer to handle the streaming logic
            // The service will directly write to the response object (res)
            await lessonPlanService.generateAndStreamLessonPlanRecommendations(teacherId, sourceLessonId, res);

        } catch (error) {
            // Catch any synchronous errors from initial checks or if service throws before streaming
            next(error);
        }
    }
}

export const lessonPlanController = new LessonPlanController(); 