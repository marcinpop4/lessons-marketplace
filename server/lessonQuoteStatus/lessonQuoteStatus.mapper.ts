import { LessonQuoteStatus, LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
// Import the Prisma type using the name it's actually generated under
import type { LessonStatus as DbLessonQuoteStatus } from '@prisma/client';

// Using a generic JsonValue type if needed, or import Prisma.JsonValue
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

/**
 * Maps between database LessonQuoteStatus objects and shared LessonQuoteStatus models.
 */
export class LessonQuoteStatusMapper {
    /**
     * Maps a database LessonQuoteStatus object to a shared LessonQuoteStatus model instance.
     * @param dbStatus The LessonQuoteStatus object from the database (typed as Prisma's LessonStatus).
     * @returns A new instance of the shared LessonQuoteStatus model.
     */
    // Parameter type uses the imported Prisma type alias
    public static toModel(dbStatus: DbLessonQuoteStatus): LessonQuoteStatus {
        try {
            // Destructure fields expected from the DB based on the *actual* LessonQuoteStatus model
            // Prisma might name the foreign key field differently, adjust if needed.
            // Common pattern is modelNameId, e.g., lessonQuoteId. Check generated types if unsure.
            const { id, lessonQuoteId, status, context, createdAt } = dbStatus as any; // Use 'as any' temporarily if fields differ, then fix

            // We need to be sure 'lessonQuoteId' exists on Prisma's LessonStatus type when used for quotes.
            // If Prisma's LessonStatus *doesn't* have lessonQuoteId, the mapping is fundamentally flawed.
            if (typeof lessonQuoteId !== 'string') {
                console.error('[LessonQuoteStatusMapper] Prisma LessonStatus object is missing expected lessonQuoteId field:', dbStatus);
                throw new Error('Prisma object is missing expected lessonQuoteId field for quote status mapping.');
            }

            // Validate status value against the shared enum
            const statusValue = Object.values(LessonQuoteStatusValue).includes(status as LessonQuoteStatusValue)
                ? status as LessonQuoteStatusValue
                : LessonQuoteStatusValue.CREATED; // Or throw an error if default is not desired

            if (statusValue !== status) {
                console.warn(`Invalid status value '${status}' received from DB for LessonQuoteStatus ID ${id}. Defaulting to ${statusValue}.`);
                // Depending on requirements, you might want to throw an error here instead of defaulting
                // throw new Error(`Invalid status value '${status}' received from DB for LessonQuoteStatus ID ${id}`);
            }

            // Construct the shared model instance
            return new LessonQuoteStatus({
                id,
                lessonQuoteId, // Use the extracted (and validated) lessonQuoteId
                status: statusValue,
                context: context as JsonValue, // Cast context if necessary
                createdAt: createdAt ?? undefined
            });
        } catch (error: unknown) {
            console.error('Error in LessonQuoteStatusMapper.toModel:', error);
            throw new Error(`Failed to transform LessonQuoteStatus: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 