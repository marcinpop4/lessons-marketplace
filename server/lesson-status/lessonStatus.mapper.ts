import { LessonStatus, LessonStatusValue } from '../../shared/models/LessonStatus.js';

// Define the JsonValue type locally, mirroring the Prisma definition
type JsonValue =
    | string
    | number
    | boolean
    | null
    | { [key: string]: JsonValue }
    | JsonValue[];

// Define database types locally instead of using Prisma
type DbLessonStatus = {
    id: string;
    lessonId: string;
    status: string;
    context: any;
    createdAt: Date;
};

/**
 * Maps between database LessonStatus objects and shared LessonStatus models.
 */
export class LessonStatusMapper {
    /**
     * Maps a database LessonStatus object to a shared LessonStatus model instance.
     * @param dbStatus The LessonStatus object from database.
     * @returns A new instance of the shared LessonStatus model.
     */
    public static toModel(dbStatus: DbLessonStatus): LessonStatus {
        try {
            const { id, lessonId, status, context, createdAt } = dbStatus;

            // Validate status value against the shared enum
            const statusValue = Object.values(LessonStatusValue).includes(status as LessonStatusValue)
                ? status as LessonStatusValue
                : LessonStatusValue.REQUESTED; // Default value

            if (statusValue !== status) {
                console.warn(`Invalid status value '${status}' received from DB for status ID ${id}. Defaulting to ${statusValue}.`);
            }

            // Construct the shared model instance
            return new LessonStatus({
                id,
                lessonId,
                status: statusValue,
                context: context as JsonValue,
                createdAt: createdAt ?? undefined
            });
        } catch (error: unknown) {
            console.error('Error in LessonStatusMapper.toModel:', error);
            throw new Error(`Failed to transform LessonStatus: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 