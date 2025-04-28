import { Request, Response, NextFunction } from 'express';
import { goalService } from './goal.service.js';
// GoalStatusTransition needed for type casting if required, but zod schema removed
// import { GoalStatusTransition } from '../../shared/models/GoalStatus.js';
// Zod removed as validation moves to service
// import { z } from 'zod';
// Errors are handled by central error handler or service
import { BadRequestError } from '../errors/index.js';
import { UserType as PrismaUserType } from '@prisma/client';

// Zod Schemas Removed
// const createGoalSchema = z.object({ ... });
// const updateGoalStatusSchema = z.object({ ... });
// const generateRecommendationsSchema = z.object({ ... });
// const goalIdParamSchema = z.object({ ... });

// Define AuthenticatedRequest interface using PrismaUserType
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        userType: PrismaUserType; // Use Prisma's UserType
    };
}

export const goalController = {
    /**
     * POST /goals - Create a new goal for a lesson
     */
    async createGoal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                // Still good practice to check for user from auth middleware
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Extract data directly from body
            const { lessonId, title, description, estimatedLessonCount } = req.body;

            // Call service - validation happens inside
            const goal = await goalService.createGoal(
                userId,
                lessonId, // Pass raw value
                title, // Pass raw value
                description, // Pass raw value
                estimatedLessonCount // Pass raw value
            );
            res.status(201).json(goal);
        } catch (error) {
            next(error); // Pass errors (including BadRequestError from service) to the central error handler
        }
    },

    /**
     * PATCH /goals/:goalId - Update the status of a goal
     */
    async updateGoalStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Extract goalId directly
            const { goalId } = req.params;

            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Extract transition and context directly
            const { transition, context } = req.body;

            // Call service - validation happens inside
            const goal = await goalService.updateGoalStatus(
                userId,
                goalId, // Pass raw value
                transition, // Pass raw value
                context ?? null // Pass context or null
            );
            res.status(200).json(goal);
        } catch (error) {
            next(error); // Pass errors (including BadRequestError) to central handler
        }
    },

    /**
     * GET /goals/:goalId - Get a specific goal by ID
     */
    async getGoalById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Extract goalId directly
            const { goalId } = req.params;

            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Call service - ID validation and authorization happens inside
            const goal = await goalService.getGoalById(goalId, userId);
            // Service throws NotFoundError or AuthorizationError if needed
            res.status(200).json(goal);
        } catch (error) {
            next(error); // Pass errors (NotFound, Auth, BadIdFormat) to central handler
        }
    },

    /**
     * GET /goals?lessonId=... - Get all goals for a specific lesson
     * Requires authentication. Authorization (student/teacher owns lesson) is handled in service.
     */
    async getGoalsByLessonId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Extract lessonId directly
            const { lessonId } = req.query;
            const authenticatedUser = req.user;

            // Validate user presence
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Call service - lessonId validation and authorization happens inside
            // Cast lessonId to string as query params can be string | string[] | ParsedQs | ParsedQs[]
            const goals = await goalService.getGoalsByLessonId(String(lessonId), userId);
            res.status(200).json(goals);
        } catch (error) {
            next(error); // Pass errors (NotFound, Auth, BadIdFormat) to central handler
        }
    },

    /**
     * POST /goals/recommendations/generate - Generate AI-powered goal recommendations
     */
    async generateRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Extract lessonId from the *query* parameters for consistency
            const { lessonId } = req.query;
            if (!lessonId || typeof lessonId !== 'string') {
                // Send 400 if lessonId is missing or invalid
                return next(new BadRequestError('Missing or invalid lessonId query parameter.'));
            }

            // Call service - validation and authorization happens inside
            const recommendations = await goalService.generateGoalRecommendations(lessonId, userId);
            res.status(200).json(recommendations);
        } catch (error) {
            next(error); // Pass errors to central handler
        }
    },

    /**
     * GET /goals/recommendations/stream - Stream AI-powered goal recommendations
     */
    async streamRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                // Cannot easily throw for SSE once headers might be sent, log and maybe end
                console.error("[SSE Controller] Authenticated user ID not found.");
                res.status(401).end(); // End with Unauthorized
                return;
            }
            const userId = authenticatedUser.id;

            // Extract lessonId and count from query parameters
            const { lessonId, count: countQuery } = req.query;
            if (!lessonId || typeof lessonId !== 'string') {
                // Send 400 if lessonId is missing or invalid
                return next(new BadRequestError('Missing or invalid lessonId query parameter.'));
            }

            // Parse count
            const DEFAULT_COUNT = 5;
            let count = DEFAULT_COUNT;
            if (countQuery && typeof countQuery === 'string') {
                const parsedCount = parseInt(countQuery, 10);
                if (!isNaN(parsedCount)) {
                    count = parsedCount;
                    // Range validation is now in the service, keep basic parse here
                }
            }

            // Call the service method that now uses the SSE utility
            // No need to set headers here, the utility does it.
            await goalService.streamGoalRecommendations(lessonId, res, userId);

            // IMPORTANT: Do not call res.end() here. The streamJsonResponse utility handles it.

        } catch (error) {
            // Catch errors that occur *before* streaming starts (e.g., service validation)
            console.error("Error setting up stream in goalController:", error);
            // Let the central error handler manage the response if headers not sent
            if (!res.headersSent) {
                next(error);
            }
            // If headers are already sent, the streamJsonResponse utility handles error reporting within the stream.
        }
    },
}; // End of goalController export