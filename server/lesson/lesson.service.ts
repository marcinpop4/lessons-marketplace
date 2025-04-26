import { PrismaClient, Prisma } from '@prisma/client';
import { LessonStatus, LessonStatusValue, LessonStatusTransition } from '../../shared/models/LessonStatus.js';
import { Lesson, DbLessonWithNestedRelations } from '../../shared/models/Lesson.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../prisma.js';
import { LessonMapper } from './lesson.mapper.js';

// Define the includes needed for transforming to a Lesson model via LessonMapper
const lessonIncludeForMapper = {
    // Include the relations required by DbLessonWithNestedRelations
    currentStatus: true,
    quote: {
        include: {
            // Include relations required by LessonQuote mapper
            teacher: {
                include: {
                    teacherLessonHourlyRates: true
                }
            },
            lessonRequest: {
                include: {
                    student: true,
                    address: true
                }
            }
        }
    }
};

// Define the includes needed for the controller's transformToModel (if different and still used elsewhere)
// For now, let's assume we primarily want the structure for LessonMapper
// const lessonIncludeForControllerTransform = { ... };

class LessonService {
    private readonly prisma = prisma;

    /**
     * Create a new lesson from a quote and set its initial status to REQUESTED
     * @param quoteId The ID of the quote to create a lesson from
     * @returns The created Lesson shared model instance
     * @throws Error if creation fails or lesson not found post-creation
     */
    async create(quoteId: string): Promise<Lesson> { // Return non-nullable Lesson
        try {
            // Run the transaction and get the lessonId back
            const lessonId = await this.prisma.$transaction(async (tx) => {
                const quote = await tx.lessonQuote.findUnique({
                    where: { id: quoteId },
                    // No complex includes needed here, just check existence
                });

                if (!quote) {
                    // Throw inside transaction to cause rollback
                    throw new Error(`Quote with ID ${quoteId} not found`);
                }

                const currentLessonId = uuidv4();

                await tx.lesson.create({
                    data: {
                        id: currentLessonId,
                        quoteId: quote.id,
                    }
                });

                // Set initial status, updateStatusInternal handles updating lesson.currentStatusId
                await this.updateStatusInternal(
                    tx,
                    currentLessonId,
                    LessonStatusValue.REQUESTED,
                    {}
                );

                // Return the lessonId from the successful transaction
                return currentLessonId;
            });

            // Fetch the created lesson AFTER the transaction using the returned ID
            // Use findUniqueOrThrow to ensure it exists
            const createdLessonData = await this.prisma.lesson.findUniqueOrThrow({
                where: { id: lessonId },
                include: lessonIncludeForMapper // Include needed for mapping
            });

            // Use the mapper to instantiate the model
            const lessonModel = LessonMapper.toModel(createdLessonData as unknown as DbLessonWithNestedRelations);

            // Check if model instantiation failed
            if (!lessonModel) {
                console.error(`Failed to instantiate Lesson model from DB data for supposedly created lesson ID: ${lessonId}`);
                throw new Error(`Data integrity issue: Failed to create Lesson model for ID ${lessonId}`);
            }

            return lessonModel;

        } catch (error) {
            // Log the specific error during creation
            console.error(`Error creating lesson from quote ${quoteId}:`, error instanceof Error ? error.message : 'Unknown error');
            // Re-throw the original error or a new one
            throw error;
        }
    }

    /**
     * Internal method to update status - used within transactions
     * @param tx Transaction client
     * @param lessonId The ID of the lesson to update
     * @param newStatusValue The new status value
     * @param context Additional context about the status change
     * @returns The ID of the newly created status record
     */
    private async updateStatusInternal(
        tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        lessonId: string,
        newStatusValue: LessonStatusValue,
        context: Record<string, unknown> = {}
    ): Promise<string> {
        const newStatusId = uuidv4();
        await tx.lessonStatus.create({
            data: {
                id: newStatusId,
                lessonId: lessonId,
                status: newStatusValue,
                context: context as Prisma.InputJsonValue,
            }
        });

        // Update the lesson to point to the new latest status
        await tx.lesson.update({
            where: { id: lessonId },
            data: { currentStatusId: newStatusId }
        });

        // Return the ID of the created status record
        return newStatusId;
    }

    /**
     * Update the lesson's status by creating a new status record and updating the lesson's reference.
     * Handles the transaction internally.
     * **Validates the transition based on current status.**
     * @param lessonId The ID of the lesson to update
     * @param transition The requested status transition
     * @param context Additional context about the status change
     * @param authenticatedUserId ID of the user performing the action (for validation)
     * @returns The updated Lesson object with includes.
     * @throws Error if the update fails or transition is invalid
     */
    async updateStatus(
        lessonId: string,
        transition: LessonStatusTransition,
        context: Record<string, unknown> = {},
        authenticatedUserId?: string // Optional user ID for authorization
    ): Promise<Lesson | null> { // Return type remains nullable due to catch block
        try {
            return await this.prisma.$transaction(async (tx) => {
                // Fetch the lesson, selecting the currentStatusId and quote for auth
                const currentLesson = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    select: {
                        currentStatusId: true, // Select the ID field
                        quote: { select: { teacherId: true } } // Still need quote for auth check
                    }
                });

                if (!currentLesson) {
                    throw new Error(`Lesson with ID ${lessonId} not found.`);
                }

                // Check if currentStatusId itself is missing
                if (!currentLesson.currentStatusId) {
                    // Throw the specific error message seen in logs
                    throw new Error(`Lesson ${lessonId} is missing or has invalid status information.`);
                }

                // Basic authorization check
                if (authenticatedUserId && currentLesson.quote?.teacherId !== authenticatedUserId) {
                    throw new Error('Unauthorized: You are not the teacher for this lesson.');
                }

                // Fetch the current status record separately using the ID
                const currentStatusRecord = await tx.lessonStatus.findUniqueOrThrow({
                    where: { id: currentLesson.currentStatusId }
                });

                // Now get the status value from the fetched record
                const currentStatusValue = currentStatusRecord.status as LessonStatusValue;

                // Validate the requested transition using the explicitly fetched status
                const newStatusValue = LessonStatus.getResultingStatus(currentStatusValue, transition);
                if (!newStatusValue) {
                    throw new Error(`Invalid status transition '${transition}' for current status '${currentStatusValue}'.`);
                }

                // Proceed with updating the status internally
                await this.updateStatusInternal(tx, lessonId, newStatusValue, context);

                // Fetch and return the fully updated lesson data using the standard include
                const updatedLessonData = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    include: lessonIncludeForMapper // Use the include for mapping
                });

                if (!updatedLessonData) {
                    // This error handling remains important
                    throw new Error(`Failed to fetch updated lesson data for ID ${lessonId} after status update.`);
                }

                // Use mapper to instantiate and return the model
                return LessonMapper.toModel(updatedLessonData as unknown as DbLessonWithNestedRelations);
            });
        } catch (error) {
            console.error(`Error updating status for lesson ${lessonId} via transition ${transition}:`, error);
            // If the specific error message is thrown, propagate it
            if (error instanceof Error && error.message.includes('missing or has invalid status information')) {
                throw new Error(error.message); // Re-throw specific error
            }
            // Otherwise, throw a generic error or handle differently
            throw new Error(`Failed to update lesson status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a lesson by ID, returning the shared Lesson model instance.
     * @param lessonId The ID of the lesson to fetch
     * @returns The shared Lesson model instance or null if not found
     */
    async getLessonById(lessonId: string): Promise<Lesson | null> {
        try {
            const lessonData = await this.prisma.lesson.findUnique({
                where: { id: lessonId },
                include: lessonIncludeForMapper // Use the include for mapping
            });

            if (!lessonData) {
                return null;
            }

            // Use mapper to instantiate and return the model
            return LessonMapper.toModel(lessonData as unknown as DbLessonWithNestedRelations);
        } catch (error) {
            console.error(`Error fetching lesson ${lessonId}:`, error);
            // Re-throw or return null based on desired error handling
            throw new Error(`Failed to fetch lesson: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get lessons by quote ID, returning shared Lesson model instances.
     * @param quoteId The ID of the quote
     * @returns Array of shared Lesson model instances
     */
    async getLessonsByQuoteId(quoteId: string): Promise<Lesson[]> {
        try {
            const lessonsData = await this.prisma.lesson.findMany({
                where: { quoteId },
                include: lessonIncludeForMapper // Use the include for mapping
            });

            // Use mapper to instantiate models and filter out nulls
            return lessonsData
                .map(data => LessonMapper.toModel(data as unknown as DbLessonWithNestedRelations))
                .filter((lesson): lesson is Lesson => lesson !== null);
        } catch (error) {
            console.error(`Error fetching lessons for quote ${quoteId}:`, error);
            // Re-throw or return empty array
            throw new Error(`Failed to fetch lessons by quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods for LessonService ---
    // async getLessonById(lessonId: string): Promise<Lesson | null> { ... }
    // async createLesson(quoteId: string): Promise<Lesson> { ... } 
    // etc.
}

// Export singleton instance
export const lessonService = new LessonService(); 