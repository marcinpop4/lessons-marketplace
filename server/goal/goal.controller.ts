import { Request, Response, NextFunction } from 'express';
import { goalService } from './goal.service.js';
import { GoalStatusTransition } from '../../shared/models/GoalStatus.js';
import { z } from 'zod';
import { BadRequestError } from '../errors/index.js';

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

export const goalController = {
    /**
     * POST /goals - Create a new goal for a lesson
     */
    async createGoal(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = createGoalSchema.parse(req.body);
            const goal = await goalService.createGoal(
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
    async updateGoalStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const goalId = req.params.goalId;
            if (!goalId) {
                res.status(400).json({ message: 'Goal ID is required in the URL path.' });
                return;
            }

            const validatedData = updateGoalStatusSchema.parse(req.body);
            const goal = await goalService.updateGoalStatus(
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
    async getGoalById(req: Request, res: Response, next: NextFunction) {
        try {
            const goalId = req.params.goalId;
            if (!goalId) {
                res.status(400).json({ message: 'Goal ID is required in the URL path.' });
                return;
            }

            const goal = await goalService.getGoalById(goalId);
            if (!goal) {
                res.status(404).json({ message: `Goal with ID ${goalId} not found.` });
                return;
            }
            res.status(200).json(goal);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /lessons/:lessonId/goals - Get all goals for a specific lesson
     */
    async getGoalsByLessonId(req: Request, res: Response, next: NextFunction) {
        try {
            const lessonId = req.params.lessonId;
            if (!lessonId) {
                res.status(400).json({ message: 'Lesson ID is required in the URL path.' });
                return;
            }

            const goals = await goalService.getGoalsByLessonId(lessonId);
            res.status(200).json(goals);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /goals/recommendations/generate - Generate AI-powered goal recommendations
     */
    async generateRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { lessonId } = req.query;
            if (typeof lessonId !== 'string') {
                throw new BadRequestError('Lesson ID query parameter is required');
            }
            const recommendations = await goalService.generateGoalRecommendations(lessonId);
            res.status(200).json(recommendations);
        } catch (error) {
            next(error);
        }
    },

    // === New Streaming Method ===
    async streamRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Flush the headers to establish the connection

        try {
            // Extract and validate lessonId
            const { lessonId } = req.query;
            if (typeof lessonId !== 'string') {
                res.write(`event: error\ndata: ${JSON.stringify({ message: 'Lesson ID query parameter is required' })}\n\n`);
                res.end();
                return;
            }

            // Extract and validate count (default to 5, max 10 for safety)
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

            // Call the service method, passing lessonId, count, and response object
            await goalService.streamGoalRecommendations(lessonId, count, res);

            // Service method will call res.end() when done or on error

        } catch (error) {
            // If error happens before/during service call setup (but after headers flushed)
            console.error("Error in streamRecommendations controller:", error);
            // Send an error event and close connection
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during streaming.';
            try {
                res.write(`event: error\ndata: ${JSON.stringify({ message: errorMessage })}\n\n`);
            } catch (writeError) {
                console.error("Failed to write error event to SSE stream:", writeError);
            }
            res.end();
            // Note: Cannot call next(error) after headers are sent.
        }
    }
}; 