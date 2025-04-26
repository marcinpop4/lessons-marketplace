import { GoalStatus, GoalStatusValue } from '../../shared/models/GoalStatus.js';

// Define the database type locally
type DbGoalStatus = {
    id: string;
    goalId: string;
    status: string;
    context?: any | null;
    createdAt: Date;
};

/**
 * Mapper class to transform between database GoalStatus models and domain GoalStatus models.
 */
export class GoalStatusMapper {
    /**
     * Maps a Prisma GoalStatus object to a domain GoalStatus model.
     * 
     * @param dbGoalStatus The GoalStatus object fetched from Prisma.
     * @returns A GoalStatus domain model instance.
     * @throws Error if the status value is invalid.
     */
    static toModel(dbGoalStatus: DbGoalStatus): GoalStatus {
        // Validate the status string against the enum
        const statusValue = dbGoalStatus.status as GoalStatusValue;
        if (!Object.values(GoalStatusValue).includes(statusValue)) {
            throw new Error(`Invalid status value '${dbGoalStatus.status}' encountered for GoalStatus ${dbGoalStatus.id}`);
        }

        return new GoalStatus({
            id: dbGoalStatus.id,
            goalId: dbGoalStatus.goalId,
            status: statusValue,
            context: dbGoalStatus.context,
            createdAt: dbGoalStatus.createdAt
        });
    }

    /**
     * Maps an array of Prisma GoalStatus objects to domain GoalStatus models.
     * 
     * @param dbGoalStatuses Array of GoalStatus objects fetched from Prisma
     * @returns Array of converted GoalStatus domain models
     */
    static toModelArray(dbGoalStatuses: DbGoalStatus[]): GoalStatus[] {
        return dbGoalStatuses.map(dbGoalStatus => this.toModel(dbGoalStatus));
    }

    // Note: toPersistence method would be added here if needed for saving
    // domain models back to the database
} 