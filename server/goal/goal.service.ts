import { Prisma } from '@prisma/client';
import { Goal, GoalStatus, GoalStatusTransition, GoalStatusValue, DbGoalWithStatus } from '../../shared/models/index.js';
import { randomUUID } from 'crypto';
// import { AppError } from '../utils/AppError.js'; // Old import
import { NotFoundError } from '../errors/NotFoundError.js';
import { BadRequestError } from '../errors/BadRequestError.js';
import OpenAI from 'openai';
import { studentService } from '../student/student.service.js';
import { lessonService } from '../lesson/lesson.service.js';
import { teacherService } from '../teacher/teacher.service.js';
import prisma from '../prisma.js';
import { LessonType } from '../../shared/models/LessonType.js';

// Type for Lesson with goals included
type LessonWithGoals = Prisma.LessonGetPayload<{
    include: {
        quote: {
            include: {
                lessonRequest: {
                    include: {
                        student: true;
                        address: true;
                    };
                };
                teacher: true;
            };
        };
        goals: {
            include: {
                currentStatus: true;
            };
        };
    };
}>;

// Types for API responses
interface LessonResponse {
    id: string;
    quote: {
        teacher: { id: string };
        lessonRequest: {
            student: { id: string };
            type: LessonType;
            startTime: string;
            durationMinutes: number;
        };
    };
    goals?: {
        title: string;
        description: string;
        currentStatus?: {
            status: GoalStatusValue;
        };
    }[];
}

interface StudentResponse {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
}

/**
 * Service layer for handling Goal-related operations.
 */
export const goalService = {
    /**
     * Creates a new Goal for a given Lesson.
     */
    async createGoal(lessonId: string, title: string, description: string, estimatedLessonCount: number): Promise<Goal> {
        // Check if the lesson exists
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
        });

        if (!lesson) {
            // throw new Error(`Lesson with ID ${lessonId} not found.`);
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
        }

        const goalId = randomUUID();
        const initialStatusId = randomUUID();
        const initialStatusValue = GoalStatusValue.CREATED;

        await prisma.$transaction(async (tx) => {
            const newGoal = await tx.goal.create({
                data: {
                    id: goalId,
                    lessonId: lessonId,
                    title: title,
                    description: description,
                    estimatedLessonCount: estimatedLessonCount,
                },
            });
            const newStatusRecord = await tx.goalStatus.create({
                data: {
                    id: initialStatusId,
                    goalId: newGoal.id,
                    status: initialStatusValue,
                },
            });
            // Update only, don't fetch relations here
            await tx.goal.update({
                where: { id: newGoal.id },
                data: { currentStatusId: newStatusRecord.id },
            });
        });

        // Fetch the complete goal with status AFTER the transaction
        const createdGoalWithStatus = await prisma.goal.findUniqueOrThrow({
            where: { id: goalId },
            include: { currentStatus: true },
        });

        // Use the factory method on the fetched data
        const goalModel = Goal.fromDb(createdGoalWithStatus as DbGoalWithStatus); // Cast needed here
        if (!goalModel) {
            // Handle cases where fromDb might return null
            throw new Error(`Failed to construct Goal model from created DB data for goal ID: ${goalId}`);
        }

        return goalModel;
    },

    /**
     * Updates the status of an existing Goal.
     */
    async updateGoalStatus(
        goalId: string,
        transition: GoalStatusTransition,
        context: Prisma.JsonValue | null = null
    ): Promise<Goal> {
        // Fetch the goal *just to check existence* before transaction
        // Access model via prisma.goal
        const goalExists = await prisma.goal.findUnique({
            where: { id: goalId },
            select: { id: true }
        });

        if (!goalExists) {
            // Throw error here if goal doesn't exist before starting transaction
            throw new NotFoundError(`Goal with ID ${goalId} not found.`);
        }

        await prisma.$transaction(async (tx) => {
            const currentGoal = await tx.goal.findUniqueOrThrow({ where: { id: goalId } });

            // Explicitly check if currentStatusId is null
            if (!currentGoal.currentStatusId) {
                throw new BadRequestError(`Goal with ID ${goalId} has a null currentStatusId, cannot update status.`);
            }

            // Access model via tx.goalStatus
            const currentStatusRecord = await tx.goalStatus.findUniqueOrThrow({
                where: { id: currentGoal.currentStatusId }, // Now guaranteed not null
            });
            const currentStatusValue = currentStatusRecord.status as GoalStatusValue;
            // Store potentially undefined value first
            const maybeNewStatusValue = GoalStatus.getResultingStatus(currentStatusValue, transition);
            if (!maybeNewStatusValue) { // Check if undefined
                throw new BadRequestError(`Invalid status transition '${transition}' for current status '${currentStatusValue}'.`);
            }
            // Assign the validated status value
            const newStatusValue = maybeNewStatusValue;

            const newStatusId = randomUUID();
            // Access model via tx.goalStatus
            const newStatusRecord = await tx.goalStatus.create({
                data: {
                    id: newStatusId,
                    goalId: goalId,
                    status: newStatusValue,
                    // Cast context to satisfy Prisma's InputJsonValue requirement
                    context: context as Prisma.InputJsonValue,
                },
            });
            // Update only, don't fetch relations here
            await tx.goal.update({
                where: { id: goalId },
                data: { currentStatusId: newStatusRecord.id },
            });
        });

        // Fetch the complete goal with status AFTER the transaction
        const updatedGoalWithStatus = await prisma.goal.findUniqueOrThrow({
            where: { id: goalId },
            include: { currentStatus: true },
        });

        // Use the factory method on the fetched data
        const goalModel = Goal.fromDb(updatedGoalWithStatus as DbGoalWithStatus); // Cast needed here
        if (!goalModel) {
            // Handle cases where fromDb might return null
            throw new Error(`Failed to construct Goal model from updated DB data for goal ID: ${goalId}`);
        }

        return goalModel;
    },

    /**
     * Retrieves a Goal by its ID.
     */
    async getGoalById(goalId: string): Promise<Goal | null> {
        const goalData = await prisma.goal.findUnique({
            where: { id: goalId },
            include: { currentStatus: true } // Ensure status is included
        });

        if (!goalData) {
            return null;
        }

        // Use the factory method
        return Goal.fromDb(goalData as DbGoalWithStatus); // Cast needed as Prisma types don't automatically narrow
    },

    /**
    * Retrieves all Goals for a specific Lesson.
    */
    async getGoalsByLessonId(lessonId: string): Promise<Goal[]> {
        const goalsData = await prisma.goal.findMany({
            where: { lessonId: lessonId },
            orderBy: { createdAt: 'asc' },
            include: {
                currentStatus: true // Ensure status is included
            }
        });

        // Use the factory method and filter out nulls
        return goalsData
            .map(goalData => Goal.fromDb(goalData as DbGoalWithStatus)) // Cast needed
            .filter((goal): goal is Goal => goal !== null); // Type guard to filter nulls and satisfy TS
    },

    /**
     * Counts the number of Goals for a specific Lesson.
     * @param lessonId The ID of the lesson.
     * @returns The number of goals associated with the lesson.
     */
    async getGoalCountByLessonId(lessonId: string): Promise<number> {
        try {
            const count = await prisma.goal.count({
                where: { lessonId: lessonId },
            });
            return count;
        } catch (error) {
            console.error(`Error counting goals for lesson ${lessonId}:`, error);
            // Consider specific error handling or re-throwing
            throw new Error(`Failed to count goals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    /**
     * Generates AI-powered goal recommendations for a lesson
     * @param lessonId The ID of the lesson to generate recommendations for
     * @returns Array of goal recommendations
     */
    async generateGoalRecommendations(
        lessonId: string
    ): Promise<Array<{ goal: { title: string; description: string; numberOfLessons: number } }>> {
        // Get the current lesson details through the lesson API
        const lessonResponse = await fetch(`/api/v1/lessons/${lessonId}`);
        if (!lessonResponse.ok) {
            throw new NotFoundError(`Lesson with ID ${lessonId} not found`);
        }
        const lesson = await lessonResponse.json() as LessonResponse;

        const studentId = lesson.quote.lessonRequest.student.id;
        const teacherId = lesson.quote.teacher.id;

        // Get student details through the student API
        const studentResponse = await fetch(`/api/v1/students/${studentId}`);
        if (!studentResponse.ok) {
            throw new NotFoundError(`Student with ID ${studentId} not found`);
        }
        const student = await studentResponse.json() as StudentResponse;

        // Get teacher's lessons through the teacher API
        const teacherLessonsResponse = await fetch(`/api/v1/teachers/${teacherId}/lessons`);
        if (!teacherLessonsResponse.ok) {
            throw new Error(`Failed to fetch teacher lessons`);
        }
        const allTeacherLessons = await teacherLessonsResponse.json() as LessonResponse[];

        // Filter lessons to get only this student's past lessons
        const pastLessons = allTeacherLessons
            .filter((l: LessonResponse) =>
                l.quote.lessonRequest.student.id === studentId &&
                l.id !== lessonId
            )
            .sort((a: LessonResponse, b: LessonResponse) =>
                new Date(b.quote.lessonRequest.startTime).getTime() -
                new Date(a.quote.lessonRequest.startTime).getTime()
            );

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const prompt = {
            role: "system",
            content: `You are a helpful assistant that helps teachers come up with goals for one-on-one lessons. Based on the student info, current lesson details, and past lesson history, suggest 5 goals. Each goal should have a title, description, and estimated number of lessons to achieve it. Format your response as a JSON array of objects with the structure: { goal: { title: string, description: string, numberOfLessons: number } }`
        } as const;

        const userMessage = {
            role: "user",
            content: JSON.stringify({
                student,
                currentLesson: lesson,
                pastLessons
            })
        } as const;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [prompt, userMessage],
                temperature: 0.7,
                max_tokens: 2000,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            return JSON.parse(response);
        } catch (error) {
            console.error('Error generating goal recommendations:', error);
            throw new Error('Failed to generate goal recommendations');
        }
    }
}; 