import { LessonQuoteStatus as PrismaLessonQuoteStatus } from '@prisma/client';
import { LessonQuoteStatus, LessonQuoteStatusValue } from '../../shared/models/LessonQuoteStatus.js';
import { JsonValue } from '../../shared/types/JsonTypes.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for lesson quote status mapper
const logger = createChildLogger('lesson-quote-status-mapper');

/**
 * Maps between database LessonQuoteStatus objects and shared LessonQuoteStatus models.
 */
export class LessonQuoteStatusMapper {
    /**
     * Maps a database LessonQuoteStatus object to a shared LessonQuoteStatus model instance.
     * @param dbStatus The LessonQuoteStatus object from the database.
     * @returns A new instance of the shared LessonQuoteStatus model.
     */
    // Use the imported aliased Prisma type
    public static toModel(dbStatus: PrismaLessonQuoteStatus): LessonQuoteStatus {
        try {
            // Destructure fields from the correct Prisma type
            const { id, lessonQuoteId, status, context, createdAt } = dbStatus;

            // Validate status value against the shared enum
            const statusValue = Object.values(LessonQuoteStatusValue).includes(status as LessonQuoteStatusValue)
                ? status as LessonQuoteStatusValue
                : undefined; // Explicitly handle invalid status

            if (statusValue === undefined) {
                logger.error(`[LessonQuoteStatusMapper] Invalid status value '${status}' received from DB for LessonQuoteStatus ID ${id}.`);
                // Throw an error instead of defaulting or warning
                throw new Error(`Invalid status value '${status}' received from DB for LessonQuoteStatus ID ${id}`);
            }

            // Construct the shared model instance
            return new LessonQuoteStatus({
                id,
                lessonQuoteId, // Use the extracted lessonQuoteId
                status: statusValue,
                // Cast context with nullish coalescing for safety
                context: (context as JsonValue) ?? null,
                createdAt: createdAt ?? undefined
            });
        } catch (error: unknown) {
            logger.error('Error in LessonQuoteStatusMapper.toModel:', error);
            throw new Error(`Failed to transform LessonQuoteStatus: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 