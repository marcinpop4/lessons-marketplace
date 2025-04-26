import { Request, Response, NextFunction } from 'express';
import { goalService } from './goal.service.js';
// GoalStatusTransition needed for type casting if required, but zod schema removed
// import { GoalStatusTransition } from '../../shared/models/GoalStatus.js';
// Zod removed as validation moves to service
// import { z } from 'zod';
// Errors are handled by central error handler or service
// import { BadRequestError } from '../errors/index.js';
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
            // Extract lessonId directly
            const { lessonId } = req.query;
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Call service - lessonId validation and authorization happens inside
            const recommendations = await goalService.generateGoalRecommendations(String(lessonId), userId);
            res.status(200).json(recommendations);
        } catch (error) {
            next(error); // Pass errors (NotFound, Auth, BadIdFormat, OpenAI errors) to central handler
        }
    },

    // === New Streaming Method ===
    async streamRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        // Set headers for SSE - MUST happen before any async work or potential errors
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Flush the headers to establish the connection

        try {
            const authenticatedUser = req.user;
            // User ID check - required for service call
            if (!authenticatedUser?.id) {
                // Throwing here won't work well with SSE, log and end
                console.error("[SSE Controller] Authenticated user ID not found.");
                goalService._streamError(res, 'Authentication required.', 401); // Use helper
                return;
            }
            const userId = authenticatedUser.id;

            // Extract lessonId and count
            const { lessonId, count: countQuery } = req.query;

            // Parse count - Default/Max handled in service now, just need basic parse
            const DEFAULT_COUNT = 5;
            let count = DEFAULT_COUNT;
            if (countQuery && typeof countQuery === 'string') {
                const parsedCount = parseInt(countQuery, 10);
                // Basic check for number, range check is in service
                if (!isNaN(parsedCount)) {
                    count = parsedCount;
                }
            }

            // Call the service method - validation (IDs, count range) happens inside
            // It will handle writing errors/data to the response stream
            await goalService.streamGoalRecommendations(String(lessonId), count, req, res, userId);

            // NOTE: Do NOT call res.end() here. The service method is responsible
            // for managing the stream lifecycle and ending the response.

        } catch (error) {
            // Catch errors that might occur *before* the service takes over the stream,
            // or if the service itself throws synchronously before starting the stream.
            console.error("Error in streamRecommendations controller (pre-service stream):", error);
            // Use the service's helper to ensure consistent SSE error format
            const message = error instanceof Error ? error.message : 'Unknown error setting up stream.';
            // Check if headers already sent (likely if flushHeaders succeeded)
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message }));
            } else {
                // Headers sent, attempt to use SSE error format if service helper available
                goalService._streamError(res, message, 500);
            }
        }
    },
}; // End of goalController export