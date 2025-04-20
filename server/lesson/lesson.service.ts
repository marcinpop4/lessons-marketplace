import { PrismaClient } from '@prisma/client';
import { LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { v4 as uuidv4 } from 'uuid';

// Define the includes needed for the controller's transformToModel
const lessonIncludeForTransform = {
    quote: {
        include: {
            teacher: true,
            lessonRequest: {
                include: {
                    student: true,
                    address: true
                }
            }
        }
    },
    currentStatus: true // Include the current status object
};

class LessonService {

    /**
     * Create a new lesson from a quote and set its initial status to REQUESTED
     * @param prisma Prisma client instance
     * @param quoteId The ID of the quote to create a lesson from
     * @returns The created lesson
     * @throws Error if creation fails
     */
    async create(prisma: PrismaClient, quoteId: string) {
        try {
            // Use transaction to ensure both lesson and status are created
            return await prisma.$transaction(async (tx) => {
                // Fetch the quote with related data
                const quote = await tx.lessonQuote.findUnique({
                    where: { id: quoteId },
                    include: {
                        teacher: true,
                        lessonRequest: {
                            include: {
                                student: true,
                                address: true
                            }
                        }
                    }
                });

                if (!quote) {
                    throw new Error(`Quote with ID ${quoteId} not found`);
                }

                // Generate lesson ID
                const lessonId = uuidv4();

                // Create the lesson first (without status)
                const lesson = await tx.lesson.create({
                    data: {
                        id: lessonId,
                        quoteId: quote.id,
                    }
                });

                // Use the updateStatus method to set the initial status to REQUESTED
                // Since we're in a transaction, we'll use the transaction context instead of prisma directly
                const statusId = await this.updateStatusInternal(
                    tx,
                    lesson.id,
                    LessonStatusValue.REQUESTED,
                    {}
                );

                // Return the lesson with all related data
                const updatedLesson = await tx.lesson.findUnique({
                    where: { id: lesson.id },
                    include: {
                        quote: {
                            include: {
                                teacher: true,
                                lessonRequest: {
                                    include: {
                                        student: true,
                                        address: true
                                    }
                                }
                            }
                        },
                        currentStatus: true,
                        lessonStatuses: true
                    }
                });

                return updatedLesson;
            });
        } catch (error) {
            console.error(`Error creating lesson from quote ${quoteId}:`, error);
            throw new Error(`Failed to create lesson: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        tx: any,
        lessonId: string,
        newStatusValue: LessonStatusValue,
        context: Record<string, unknown> = {}
    ): Promise<string> {
        const newStatusId = uuidv4();

        // Create the new status record
        await tx.lessonStatus.create({
            data: {
                id: newStatusId,
                lessonId: lessonId,
                status: newStatusValue,
                context: context,
                createdAt: new Date()
            }
        });

        // Update the lesson to reference the new status
        await tx.lesson.update({
            where: { id: lessonId },
            data: {
                currentStatusId: newStatusId
            }
        });

        return newStatusId;
    }

    /**
     * Update the lesson's status by creating a new status record and updating the lesson's reference.
     * Handles the transaction internally.
     * @param prisma Prisma client instance
     * @param lessonId The ID of the lesson to update
     * @param newStatusValue The new status value
     * @param context Additional context about the status change
     * @returns The updated Lesson object with includes.
     * @throws Error if the update fails
     */
    async updateStatus(
        prisma: PrismaClient,
        lessonId: string,
        newStatusValue: LessonStatusValue,
        context: Record<string, unknown> = {}
    ): Promise<any> {
        try {
            return await prisma.$transaction(async (tx) => {
                // Ensure the lesson exists before trying to update
                const lessonExists = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    select: { id: true }
                });

                if (!lessonExists) {
                    throw new Error(`Lesson with ID ${lessonId} not found.`);
                }

                // Update the status internally
                await this.updateStatusInternal(tx, lessonId, newStatusValue, context);

                // Fetch and return the fully updated lesson with necessary includes
                const updatedLesson = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    include: lessonIncludeForTransform // Use the defined include object
                });

                if (!updatedLesson) {
                    // Should not happen if lessonExists was found, but defensive check
                    throw new Error(`Failed to fetch updated lesson data for ID ${lessonId} after status update.`);
                }

                // Return the full lesson object
                return updatedLesson;
            });
        } catch (error) {
            console.error(`Error updating status for lesson ${lessonId} to ${newStatusValue}:`, error);
            throw new Error(`Failed to update lesson status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods for LessonService ---
    // async getLessonById(lessonId: string): Promise<Lesson | null> { ... }
    // async createLesson(quoteId: string): Promise<Lesson> { ... } 
    // etc.
}

// Export a singleton instance
export const lessonService = new LessonService(); 