import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuoteMapper } from '../lessonQuote/lessonQuote.mapper.js';
import { LessonStatusMapper } from '../lesson-status/lessonStatus.mapper.js';

// Define database types locally
type DbLesson = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    quoteId: string;
    currentStatusId: string;
    quote?: any;
    currentStatus?: any;
};

// Define type for lesson with all required nested relations
type DbLessonWithNestedRelations = DbLesson & {
    currentStatus: {
        id: string;
        lessonId: string;
        status: string;
        context: any;
        createdAt: Date;
    };
    quote: {
        id: string;
        lessonRequestId: string;
        teacherId: string;
        hourlyRate: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        teacher: any;
        lessonRequest: any;
    };
};

/**
 * Maps between database Lesson objects and shared Lesson models.
 */
export class LessonMapper {
    /**
     * Maps a database Lesson object with included relations to a shared Lesson model instance.
     * @param dbLesson The Lesson object from database with included relations.
     * @returns A new instance of the shared Lesson model or null if required relations are missing.
     */
    public static toModel(dbLesson: DbLessonWithNestedRelations): Lesson | null {
        const { id, createdAt, updatedAt, quoteId, currentStatusId, quote, currentStatus } = dbLesson;

        if (!quote || !currentStatus) {
            console.error(`Lesson ${id} is missing required nested quote or currentStatus. Cannot transform.`);
            return null;
        }

        try {
            // Use the appropriate mappers to transform nested objects
            const transformedQuote = LessonQuoteMapper.toModel(quote);
            const transformedStatus = LessonStatusMapper.toModel(currentStatus);

            if (!transformedQuote || !transformedStatus) {
                console.error(`Failed to transform nested quote or status for lesson ${id}`);
                return null;
            }

            // Construct the shared model instance
            return new Lesson({
                id,
                quote: transformedQuote,
                currentStatus: transformedStatus,
                statuses: [transformedStatus], // Include at least the current status in statuses
                createdAt: createdAt ?? undefined,
                updatedAt: updatedAt ?? undefined,
            });
        } catch (error: unknown) {
            console.error(`Error transforming lesson ${id}:`, error);
            return null;
        }
    }
} 