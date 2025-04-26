import { Request, Response, NextFunction } from 'express';
import { goalService } from './goal.service.js';
import { GoalStatusTransition } from '../../shared/models/GoalStatus.js';
import { z } from 'zod';
import { BadRequestError } from '../errors/index.js';
// Import the Prisma-generated UserType
import { UserType as PrismaUserType } from '@prisma/client';

// Input validation schemas using Zod
const createGoalSchema = z.object({
    lessonId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().min(1),
    estimatedLessonCount: z.number().int().positive(),
});

const updateGoalStatusSchema = z.object({
    transition: z.nativeEnum(GoalStatusTransition),
    context: z.any().optional(), // Allow any JSON structure for context
});

const generateRecommendationsSchema = z.object({
    studentInfo: z.any(),
    lessonInfo: z.any(),
    pastLessons: z.array(z.any())
});

// Define param validation schema
const goalIdParamSchema = z.object({
    goalId: z.string().uuid({ message: 'Invalid Goal ID format in URL path.' })
});

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
            // Extract user ID or throw if missing (should be added by authMiddleware)
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            const validatedData = createGoalSchema.parse(req.body);
            // Pass userId to the service method
            const goal = await goalService.createGoal(
                userId, // Pass requesting user's ID
                validatedData.lessonId,
                validatedData.title,
                validatedData.description,
                validatedData.estimatedLessonCount
            );
            res.status(201).json(goal);
        } catch (error) {
            next(error); // Pass errors to the central error handler
        }
    },

    /**
     * PATCH /goals/:goalId - Update the status of a goal
     */
    async updateGoalStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Validate goalId param first
            const { goalId } = goalIdParamSchema.parse(req.params);

            // Extract user ID or throw if missing
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            const validatedData = updateGoalStatusSchema.parse(req.body);
            // Pass userId to the service method
            const goal = await goalService.updateGoalStatus(
                userId, // Pass requesting user's ID
                goalId,
                validatedData.transition,
                validatedData.context ?? null // Pass context or null
            );
            res.status(200).json(goal);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /goals/:goalId - Get a specific goal by ID
     */
    async getGoalById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Validate goalId param first
            const { goalId } = goalIdParamSchema.parse(req.params);

            // Extract user ID
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Authorization check done in service
            const goal = await goalService.getGoalById(goalId, userId);
            // Service throws NotFoundError or AuthorizationError
            res.status(200).json(goal);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /goals?lessonId=... - Get all goals for a specific lesson
     * Requires authentication. Authorization (student/teacher owns lesson) is handled in service.
     */
    async getGoalsByLessonId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { lessonId } = req.query;
            const authenticatedUser = req.user;

            if (!lessonId || typeof lessonId !== 'string') {
                throw new BadRequestError('Lesson ID query parameter is required and must be a string.');
            }

            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            const userId = authenticatedUser.id;

            // Call service, passing lessonId and userId for authorization
            const goals = await goalService.getGoalsByLessonId(lessonId, userId);
            res.status(200).json(goals);
        } catch (error) {
            next(error); // Pass errors (including potential AuthorizationError from service) to central handler
        }
    },

    /**
     * POST /goals/recommendations/generate - Generate AI-powered goal recommendations
     */
    async generateRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { lessonId } = req.query;
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                throw new Error('Authenticated user ID not found. Middleware issue?');
            }
            if (typeof lessonId !== 'string') {
                throw new BadRequestError('Lesson ID query parameter is required');
            }
            // Pass userId to service for potential authorization checks
            const recommendations = await goalService.generateGoalRecommendations(lessonId, authenticatedUser.id);
            res.status(200).json(recommendations);
        } catch (error) {
            next(error);
        }
    },

    // === New Streaming Method ===
    async streamRecommendations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Flush the headers to establish the connection

        try {
            const authenticatedUser = req.user;
            if (!authenticatedUser?.id) {
                console.error("[SSE] Authenticated user ID not found in streamRecommendations.");
                res.write(`event: error\ndata: ${JSON.stringify({ message: 'Authentication error' })}\n\n`);
                res.end();
                return;
            }

            const { lessonId } = req.query;
            if (typeof lessonId !== 'string') {
                res.write(`event: error\ndata: ${JSON.stringify({ message: 'Lesson ID query parameter is required' })}\n\n`);
                res.end();
                return;
            }

            const DEFAULT_COUNT = 5;
            const MAX_COUNT = 10;
            let count = DEFAULT_COUNT;
            if (req.query.count && typeof req.query.count === 'string') {
                const parsedCount = parseInt(req.query.count, 10);
                if (!isNaN(parsedCount) && parsedCount > 0) {
                    count = Math.min(parsedCount, MAX_COUNT); // Use parsed count, capped at max
                } else {
                    console.warn(`[SSE] Invalid count query parameter received: '${req.query.count}'. Using default ${DEFAULT_COUNT}.`);
                }
            } else {
                console.log(`[SSE] No count query parameter received. Using default ${DEFAULT_COUNT}.`);
            }

            await goalService.streamGoalRecommendations(lessonId, count, req, res, authenticatedUser.id);

        } catch (error) {
            console.error("Error in streamRecommendations controller:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during streaming.';
            try {
                res.write(`event: error\ndata: ${JSON.stringify({ message: errorMessage })}\n\n`);
            } catch (writeError) {
                console.error("Failed to write error event to SSE stream:", writeError);
            }
            res.end();
        }
    },
}; // End of goalController export