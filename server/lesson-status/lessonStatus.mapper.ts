import { LessonStatus as PrismaLessonStatus } from '@prisma/client';
import { LessonStatus, LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for lesson status mapper
const logger = createChildLogger('lesson-status-mapper');

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

            // Validate and cast the status value
            let statusValue: LessonStatusValue;
            if (!Object.values(LessonStatusValue).includes(status as LessonStatusValue)) {
                logger.warn(`Invalid status value '${status}' received from DB for status ID ${id}. Defaulting to REQUESTED.`);
                statusValue = LessonStatusValue.REQUESTED; // Default fallback
            } else {
                statusValue = status as LessonStatusValue;
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
            logger.error('Error in LessonStatusMapper.toModel:', { error });
            throw new Error(`Failed to transform LessonStatus: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 