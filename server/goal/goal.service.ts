import { Prisma, PrismaClient } from '@prisma/client';
import { Goal, GoalStatus, GoalStatusTransition, GoalStatusValue } from '../../shared/models/index.js';
import { randomUUID } from 'crypto';
// import { AppError } from '../utils/AppError.js'; // Old import
import { NotFoundError } from '../errors/NotFoundError.js';
import { BadRequestError } from '../errors/BadRequestError.js';

// Define Prisma types correctly using Prisma.ModelNameGetPayload
// Type for the GoalStatus payload when no specific includes are needed
type PrismaGoalStatusPayload = Prisma.GoalStatusGetPayload<{}>;
// Type for the Goal payload when no specific includes are needed
type PrismaGoalPayload = Prisma.GoalGetPayload<{}>;
// Type for Goal payload when currentStatus is included
type PrismaGoalWithStatusPayload = Prisma.GoalGetPayload<{ include: { currentStatus: true } }>;

const prisma = new PrismaClient();

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

        let createdGoalData: PrismaGoalPayload; // Use corrected type
        let newStatusRecord: PrismaGoalStatusPayload; // Use corrected type

        await prisma.$transaction(async (tx) => {
            // Access model via tx.goal
            const newGoal = await tx.goal.create({
                data: {
                    id: goalId,
                    lessonId: lessonId,
                    title: title,
                    description: description,
                    estimatedLessonCount: estimatedLessonCount,
                },
            });
            // Access model via tx.goalStatus
            newStatusRecord = await tx.goalStatus.create({
                data: {
                    id: initialStatusId,
                    goalId: newGoal.id,
                    status: initialStatusValue,
                },
            });
            // Access model via tx.goal
            createdGoalData = await tx.goal.update({
                where: { id: newGoal.id },
                data: { currentStatusId: newStatusRecord.id },
            });
        });

        // Construct the GoalStatus model instance from the Prisma record
        const initialGoalStatusModel = new GoalStatus(newStatusRecord!);

        return new Goal({
            ...createdGoalData!,
            currentStatus: initialGoalStatusModel // Pass the GoalStatus model instance
        });
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

        let updatedGoalData: PrismaGoalPayload; // Use corrected type
        let newStatusValue: GoalStatusValue;
        let newStatusRecord: PrismaGoalStatusPayload; // Use corrected type

        await prisma.$transaction(async (tx) => {
            // Access model via tx.goal
            const currentGoal = await tx.goal.findUniqueOrThrow({ where: { id: goalId } });
            // Access model via tx.goalStatus
            const currentStatusRecord = await tx.goalStatus.findUniqueOrThrow({
                where: { id: currentGoal.currentStatusId },
            });
            const currentStatusValue = currentStatusRecord.status as GoalStatusValue;
            // Store potentially undefined value first
            const maybeNewStatusValue = GoalStatus.getResultingStatus(currentStatusValue, transition);
            if (!maybeNewStatusValue) { // Check if undefined
                throw new BadRequestError(`Invalid status transition '${transition}' for current status '${currentStatusValue}'.`);
            }
            // Assign the validated status value
            newStatusValue = maybeNewStatusValue;

            const newStatusId = randomUUID();
            // Access model via tx.goalStatus
            newStatusRecord = await tx.goalStatus.create({
                data: {
                    id: newStatusId,
                    goalId: goalId,
                    status: newStatusValue,
                    context: context,
                },
            });
            // Access model via tx.goal
            updatedGoalData = await tx.goal.update({
                where: { id: goalId },
                data: { currentStatusId: newStatusRecord.id },
            });
        });

        // Construct the GoalStatus model instance from the new Prisma record
        const newGoalStatusModel = new GoalStatus(newStatusRecord!);

        return new Goal({
            ...updatedGoalData!,
            currentStatus: newGoalStatusModel // Pass the new GoalStatus model instance
        });
    },

    /**
     * Retrieves a Goal by its ID.
     */
    async getGoalById(goalId: string): Promise<Goal | null> {
        // Access model via prisma.goal
        const goalData = await prisma.goal.findUnique({
            where: { id: goalId },
            include: { currentStatus: true }
        });
        if (!goalData || !goalData.currentStatus) return null;

        const currentGoalStatusModel = new GoalStatus(goalData.currentStatus);
        return new Goal({ ...goalData, currentStatus: currentGoalStatusModel });
    },

    /**
    * Retrieves all Goals for a specific Lesson.
    */
    async getGoalsByLessonId(lessonId: string): Promise<Goal[]> {
        // Use corrected type
        const goalsData: PrismaGoalWithStatusPayload[] = await prisma.goal.findMany({
            where: { lessonId: lessonId },
            orderBy: { createdAt: 'asc' },
            include: {
                currentStatus: true
            }
        });

        // Map the Prisma data (including the nested status) to the Goal model
        return goalsData.map((goalData: PrismaGoalWithStatusPayload) => {
            if (!goalData.currentStatus) {
                // Handle cases where a goal might somehow be missing its status link
                // This case should be rare if the DB schema enforces the relation
                console.error(`Goal ${goalData.id} is missing its currentStatus relation. This indicates a data integrity issue.`);
                // Throw an error instead of returning a potentially invalid Goal state
                throw new Error(`Data integrity issue: Goal ${goalData.id} is missing its current status link.`);
                // // Or, if a default state is absolutely required:
                // return new Goal({
                //     ...goalData,
                //     // Choose a valid default/error status from GoalStatusValue if needed
                //     currentStatus: GoalStatusValue.CREATED // Example: default to CREATED
                // });
            }
            // Construct the GoalStatus model instance
            const currentGoalStatusModel = new GoalStatus(goalData.currentStatus);
            // Construct the Goal model instance, passing the GoalStatus model
            return new Goal({
                ...goalData,
                currentStatus: currentGoalStatusModel
            });
        });
    }
}; 