import { Request, Response, NextFunction } from 'express';
import { goalService } from './goal.service.js';
import { GoalStatusTransition } from '../../shared/models/index.js';
import { z } from 'zod';

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
    async generateRecommendations(req: Request, res: Response, next: NextFunction) {
        try {
            const lessonId = req.query.lessonId as string;
            if (!lessonId) {
                res.status(400).json({ message: 'Lesson ID is required as a query parameter.' });
                return;
            }

            const recommendations = await goalService.generateGoalRecommendations(lessonId);
            res.status(200).json(recommendations);
        } catch (error) {
            next(error);
        }
    }
}; 