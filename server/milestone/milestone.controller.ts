import { Request, Response, NextFunction } from 'express';
import { UserType as PrismaUserType } from '@prisma/client';
import { milestoneService } from './milestone.service.js'; // Import singleton instance
import { CreateMilestoneDto, UpdateMilestoneStatusDto } from './milestone.dto.js';
import { AuthorizationError, BadRequestError } from '../errors/index.js';
import { isUuid } from '../utils/validation.utils.js'; // Import for UUID validation

// Assuming AuthenticatedRequest interface is available or defined globally/shared
// If not, define it here as well:
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        userType: PrismaUserType;
    };
}

export const milestoneController = {
    /**
     * POST /milestones
     * Create a new milestone.
     */
    createMilestone: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const createDto: CreateMilestoneDto = req.body;
            const actor = req.user;

            if (!actor?.id || !actor?.userType) {
                throw new AuthorizationError('Authentication required.');
            }
            // Basic DTO validation (service handles more detailed validation)
            if (!createDto.lessonPlanId || !createDto.title || !createDto.description || !createDto.dueDate) {
                throw new BadRequestError('Lesson Plan ID, title, description, and due date are required.');
            }

            const milestone = await milestoneService.createMilestone(createDto, actor.id, actor.userType);
            res.status(201).json(milestone);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /milestones
     * Get milestones, optionally filtered by lessonPlanId.
     */
    getMilestones: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { lessonPlanId } = req.query;
            const actor = req.user;

            if (!actor?.id || !actor.userType) {
                throw new AuthorizationError('Authentication required.');
            }

            if (lessonPlanId && typeof lessonPlanId !== 'string') {
                throw new BadRequestError('lessonPlanId query parameter must be a string if provided.');
            }
            if (lessonPlanId && !isUuid(lessonPlanId)) {
                throw new BadRequestError('lessonPlanId must be a valid UUID if provided.');
            }

            // The service layer will handle authorization and logic based on actor and lessonPlanId
            const milestones = await milestoneService.getMilestones({
                lessonPlanId: lessonPlanId as string | undefined,
                actorId: actor.id,
                actorRole: actor.userType
            });
            res.status(200).json(milestones);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /milestones/:milestoneId
     * Get a specific milestone by its ID.
     */
    getMilestoneById: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { milestoneId } = req.params;
            const actor = req.user;

            if (!actor?.id) {
                throw new AuthorizationError('Authentication required.');
            }
            if (!milestoneId) {
                throw new BadRequestError('Milestone ID parameter is required.');
            }
            // Service handles further validation for milestoneId format

            const milestone = await milestoneService.getMilestoneById(milestoneId, actor.id);
            res.status(200).json(milestone);
        } catch (error) {
            next(error);
        }
    },

    /**
     * PATCH /milestones
     * Update the status of a milestone.
     */
    updateMilestoneStatus: async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const updateDto: UpdateMilestoneStatusDto = req.body;
            const actor = req.user;

            if (!actor?.id || !actor?.userType) {
                throw new AuthorizationError('Authentication required.');
            }
            // Basic DTO validation
            if (!updateDto.milestoneId || !updateDto.transition) {
                throw new BadRequestError('Milestone ID and transition are required.');
            }

            const milestone = await milestoneService.updateMilestoneStatus(updateDto, actor.id, actor.userType);
            res.status(200).json(milestone);
        } catch (error) {
            next(error);
        }
    },
}; 