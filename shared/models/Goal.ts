import { GoalStatus, GoalStatusValue } from './GoalStatus.js';
import { Goal as DbGoal, GoalStatus as DbGoalStatus } from '@prisma/client';

/**
 * Properties required to create a Goal instance.
 */
export interface GoalProps {
    id: string;
    lessonId: string; // Foreign key linking to the Lesson
    title: string; // Title is now required
    description: string;
    estimatedLessonCount: number; // Required estimate of lessons needed
    currentStatusId: string | null; // Can be null initially
    currentStatus: GoalStatus; // Changed type to GoalStatus object
    createdAt?: Date;
    updatedAt?: Date;
}

// Define the type expected from Prisma (Goal with nested currentStatus)
export type DbGoalWithStatus = DbGoal & {
    currentStatus: DbGoalStatus | null;
};

/**
 * Goal model representing a specific objective or target for a music lesson.
 */
export class Goal implements GoalProps {
    id: string;
    lessonId: string;
    title: string; // Title is now required
    description: string;
    estimatedLessonCount: number; // Required estimate
    currentStatusId: string | null;
    currentStatus: GoalStatus; // Changed type to GoalStatus object
    createdAt: Date;
    updatedAt: Date;

    constructor(props: GoalProps) {
        this.id = props.id;
        this.lessonId = props.lessonId;
        this.title = props.title;
        this.description = props.description;
        this.estimatedLessonCount = props.estimatedLessonCount;
        this.currentStatusId = props.currentStatusId ?? null;
        if (!props.currentStatus || !(props.currentStatus instanceof GoalStatus)) {
            console.warn("Goal constructor received invalid currentStatus prop", props);
            this.currentStatus = new GoalStatus({
                id: props.currentStatusId || 'unknown',
                goalId: props.id,
                status: GoalStatusValue.CREATED,
                createdAt: new Date()
            });
        } else {
            this.currentStatus = props.currentStatus;
        }
        this.createdAt = props.createdAt ?? new Date();
        this.updatedAt = props.updatedAt ?? new Date();
    }

    /**
     * Creates a Goal instance from a Prisma Goal object with its current status.
     * @param dbGoal The Goal object fetched from Prisma, including the currentStatus relation.
     * @returns A Goal instance, or null if the required currentStatus is missing.
     */
    static fromDb(dbGoal: DbGoalWithStatus): Goal | null {
        if (!dbGoal.currentStatus) {
            console.error(`[Goal.fromDb] Missing required currentStatus relation for Goal ID: ${dbGoal.id}`);
            // Return null or throw, depending on desired strictness
            return null;
        }

        try {
            // Use GoalStatus.fromDb to create the nested status object
            const goalStatus = GoalStatus.fromDb(dbGoal.currentStatus);

            return new Goal({
                id: dbGoal.id,
                lessonId: dbGoal.lessonId,
                title: dbGoal.title,
                description: dbGoal.description,
                estimatedLessonCount: dbGoal.estimatedLessonCount,
                currentStatusId: dbGoal.currentStatusId, // Keep the ID from the parent Goal record
                currentStatus: goalStatus, // Use the created GoalStatus instance
                createdAt: dbGoal.createdAt,
                updatedAt: dbGoal.updatedAt
            });
        } catch (error) {
            console.error(`[Goal.fromDb] Error creating GoalStatus for Goal ID: ${dbGoal.id}`, error);
            // Propagate the error or return null
            return null;
        }
    }
} 