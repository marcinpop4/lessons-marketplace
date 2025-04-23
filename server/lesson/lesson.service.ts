import { PrismaClient, Prisma } from '@prisma/client';
import { LessonStatus, LessonStatusValue, LessonStatusTransition } from '../../shared/models/LessonStatus.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../prisma.js';

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
    // Include the lessonStatuses relation, ordered, to match transformToModel expectation
    lessonStatuses: {
        orderBy: {
            createdAt: 'desc' as const
        },
        take: 1
    }
};

class LessonService {
    private readonly prisma = prisma;

    /**
     * Create a new lesson from a quote and set its initial status to REQUESTED
     * @param quoteId The ID of the quote to create a lesson from
     * @returns The created lesson
     * @throws Error if creation fails
     */
    async create(quoteId: string) {
        try {
            // Use transaction to ensure both lesson and status are created
            return await this.prisma.$transaction(async (tx) => {
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
                        lessonStatuses: true
                    }
                });

                return updatedLesson;
            });
        } catch (error) {
            console.error(`Error creating lesson from quote ${quoteId}:`, error instanceof Error ? error.message : 'Unknown error');
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
    ): Promise<void> {
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
    ): Promise<any> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                // Fetch the current lesson with its latest status
                const currentLesson = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    include: {
                        quote: { select: { teacherId: true } }, // Need teacherId for auth check
                        lessonStatuses: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                });

                if (!currentLesson) {
                    throw new Error(`Lesson with ID ${lessonId} not found.`);
                }

                // Basic authorization: Check if the authenticated user is the teacher of this lesson
                // Note: Add more robust authorization if students or other roles can perform actions
                if (authenticatedUserId && currentLesson.quote?.teacherId !== authenticatedUserId) {
                    throw new Error('Unauthorized: You are not the teacher for this lesson.'); // More specific error
                }

                const currentStatusValue = currentLesson.lessonStatuses?.[0]?.status as LessonStatusValue;
                if (!currentStatusValue) {
                    throw new Error(`Could not determine current status for Lesson ID ${lessonId}.`);
                }

                // Validate the requested transition
                const newStatusValue = LessonStatus.getResultingStatus(currentStatusValue, transition);
                if (!newStatusValue) {
                    throw new Error(`Invalid status transition '${transition}' for current status '${currentStatusValue}'.`);
                }

                // Proceed with updating the status internally using the VALIDATED newStatusValue
                await this.updateStatusInternal(tx, lessonId, newStatusValue, context);

                // Fetch and return the fully updated lesson with necessary includes
                const updatedLesson = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    include: lessonIncludeForTransform // Use the defined include object
                });

                if (!updatedLesson) {
                    throw new Error(`Failed to fetch updated lesson data for ID ${lessonId} after status update.`);
                }

                return updatedLesson;
            });
        } catch (error) {
            console.error(`Error updating status for lesson ${lessonId} via transition ${transition}:`, error);
            // Re-throw error with more specific message if possible
            throw new Error(`Failed to update lesson status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a lesson by ID with all related data needed for transformation
     * @param lessonId The ID of the lesson to fetch
     * @returns The lesson with transformation-required related data or null if not found
     */
    async getLessonById(lessonId: string) {
        try {
            const lesson = await this.prisma.lesson.findUnique({
                where: { id: lessonId },
                include: lessonIncludeForTransform // Use the shared include object
            });

            return lesson;
        } catch (error) {
            console.error(`Error fetching lesson ${lessonId}:`, error);
            throw new Error(`Failed to fetch lesson: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get lessons by quote ID with all related data needed for transformation
     * @param quoteId The ID of the quote
     * @returns Array of lessons with transformation-required related data
     */
    async getLessonsByQuoteId(quoteId: string) {
        try {
            const lessons = await this.prisma.lesson.findMany({
                where: { quoteId },
                include: lessonIncludeForTransform // Use the shared include object
            });

            return lessons;
        } catch (error) {
            console.error(`Error fetching lessons for quote ${quoteId}:`, error);
            throw new Error(`Failed to fetch lessons by quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods for LessonService ---
    // async getLessonById(lessonId: string): Promise<Lesson | null> { ... }
    // async createLesson(quoteId: string): Promise<Lesson> { ... } 
    // etc.
}

// Export a singleton instance
export const lessonService = new LessonService(); 