import { Goal } from '../../shared/models/Goal.js';
import { GoalStatusMapper } from './goal-status.mapper.js';

// Define the database type locally in the mapper
interface DbGoalWithStatus {
    id: string;
    lessonId: string;
    title: string;
    description: string;
    estimatedLessonCount: number;
    currentStatusId: string | null;
    currentStatus: DbGoalStatus | null;
    createdAt: Date;
    updatedAt: Date;
}

// Define the database type for GoalStatus
interface DbGoalStatus {
    id: string;
    goalId: string;
    status: string;
    context?: any | null;
    createdAt: Date;
}

/**
 * Mapper class to transform between database Goal models and domain Goal models.
 */
export class GoalMapper {
    /**
     * Maps a Prisma Goal object with its current status to a domain Goal model.
     * 
     * @param dbGoal The Goal object fetched from Prisma, including the currentStatus relation.
     * @returns A Goal domain model instance.
     * @throws Error if the required currentStatus is missing.
     */
    static toModel(dbGoal: DbGoalWithStatus): Goal {
        if (!dbGoal.currentStatus) {
            throw new Error(`Missing required currentStatus relation for Goal ID: ${dbGoal.id}`);
        }

        // Use GoalStatusMapper to convert the DB status to domain GoalStatus
        const goalStatus = GoalStatusMapper.toModel(dbGoal.currentStatus);

        // Create and return the domain Goal
        return new Goal({
            id: dbGoal.id,
            lessonId: dbGoal.lessonId,
            title: dbGoal.title,
            description: dbGoal.description,
            estimatedLessonCount: dbGoal.estimatedLessonCount,
            currentStatusId: dbGoal.currentStatusId,
            currentStatus: goalStatus,
            createdAt: dbGoal.createdAt,
            updatedAt: dbGoal.updatedAt
        });
    }

    /**
     * Maps an array of Prisma Goal objects to domain Goal models.
     * 
     * @param dbGoals Array of Goal objects fetched from Prisma
     * @returns Array of converted Goal domain models
     */
    static toModelArray(dbGoals: DbGoalWithStatus[]): Goal[] {
        return dbGoals
            .filter(dbGoal => dbGoal.currentStatus !== null)
            .map(dbGoal => this.toModel(dbGoal));
    }

    // Note: toPersistence method would be added here if needed for saving
    // domain models back to the database
} 