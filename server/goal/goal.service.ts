import { Prisma } from '@prisma/client';
import { Goal, GoalStatus, GoalStatusTransition, GoalStatusValue, DbGoalWithStatus, Lesson } from '../../shared/models/index.js';
import { DbLessonWithNestedRelations } from '../../shared/models/Lesson.js';
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

// Remove unused Prisma payload type definition
// type LessonWithGoals = Prisma.LessonGetPayload<{ ... }>;

// Remove unused API response interfaces
// interface LessonResponse { ... }
// interface StudentResponse { ... }

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
        // 1. Get the current lesson details via lessonService
        const currentLesson = await lessonService.getLessonById(lessonId);
        if (!currentLesson) {
            // Throw NotFoundError if lesson isn't found
            throw new NotFoundError(`Lesson with ID ${lessonId} not found`);
        }

        // Get IDs needed for other services (now directly from the Lesson model)
        const studentId = currentLesson.quote.lessonRequest.student.id;
        const teacherId = currentLesson.quote.teacher.id;

        // 2. Get student details via studentService
        const student = await studentService.findById(studentId);
        if (!student) {
            throw new NotFoundError(`Student with ID ${studentId} not found`);
        }

        // 3. Get teacher's lessons via teacherService
        const allTeacherLessons = await teacherService.findLessonsByTeacherId(teacherId);

        // 4. Filter for this student's past lessons
        const pastLessons = allTeacherLessons
            .filter(l => l.quote.lessonRequest.student.id === studentId && l.id !== lessonId)
            .sort((a, b) =>
                new Date(b.quote.lessonRequest.startTime).getTime() -
                new Date(a.quote.lessonRequest.startTime).getTime()
            );

        // 5. Get goals specifically for the *current* lesson
        const currentLessonGoals = await this.getGoalsByLessonId(lessonId);

        // 6. Prepare data for OpenAI prompt using shared models
        const promptData = {
            // Pass student model directly (password is stripped in Student.fromDb)
            student: student,
            currentLesson: {
                // Spread properties from the currentLesson model instance
                ...currentLesson,
                // Explicitly add the separately fetched goals
                goals: currentLessonGoals.map(g => ({
                    title: g.title,
                    description: g.description,
                    status: g.currentStatus.status
                }))
                // Note: This includes the full nested quote object. If the prompt
                // becomes too large or performs poorly, we may need to select fewer fields.
            },
            // Pass pastLessons array directly (password stripped in Lesson -> Quote -> Student.fromDb)
            pastLessons: pastLessons
        };

        // 7. Call OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const systemPrompt = {
            role: "system",
            content: `You are a helpful assistant that helps teachers come up with goals for one-on-one lessons. Based on the student info, current lesson details (including its existing goals), and past lesson history, suggest 5 new potential goals. Each goal should have a title, description, and estimated number of lessons to achieve it. Format your response as a JSON array of objects with the structure: { goal: { title: string, description: string, numberOfLessons: number } }`
        } as const;

        const userMessage = {
            role: "user",
            content: JSON.stringify(promptData) // Send the structured data from shared models
        } as const;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4", // Consider newer/cheaper models if appropriate
                messages: [systemPrompt, userMessage],
                temperature: 0.7,
                max_tokens: 2000,
                // Ensure response format is JSON if available and desired
                // response_format: { type: "json_object" }, // Uncomment if using compatible model
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            // Attempt to parse the JSON response
            try {
                return JSON.parse(response);
            } catch (parseError) {
                console.error('Error parsing OpenAI JSON response:', parseError);
                console.error('Raw OpenAI response:', response);
                throw new Error('Failed to parse goal recommendations from OpenAI response');
            }
        } catch (error) {
            console.error('Error generating goal recommendations:', error);
            throw new Error('Failed to generate goal recommendations');
        }
    }
}; 