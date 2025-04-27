import { PrismaClient, Prisma, Lesson as PrismaLesson } from '@prisma/client';
import { LessonStatus, LessonStatusValue, LessonStatusTransition } from '../../shared/models/LessonStatus.js';
import { Lesson, DbLessonWithNestedRelations } from '../../shared/models/Lesson.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../prisma.js';
import { LessonMapper } from './lesson.mapper.js';
import { BadRequestError, NotFoundError, AppError, AuthorizationError, ConflictError } from '../errors/index.js';
import { isUuid } from '../utils/validation.utils.js';

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
            },
            currentStatus: true
        }
    }
};

// Define the includes needed for the controller's transformToModel (if different and still used elsewhere)
// For now, let's assume we primarily want the structure for LessonMapper
// const lessonIncludeForControllerTransform = { ... };

interface FindLessonsOptions {
    teacherId?: string;
    quoteId?: string;
    requestingUserId?: string; // Needed for quoteId authorization
}

export class LessonService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Create a new lesson from a quote and set its initial status to ACCEPTED
     * @param quoteId The ID of the quote to create a lesson from
     * @returns The created Lesson shared model instance
     * @throws NotFoundError if the quote is not found.
     * @throws ConflictError if the quote is already associated with a lesson.
     * @throws Error if creation fails otherwise.
     */
    async create(quoteId: string): Promise<Lesson> {
        // --- Validation ---
        if (!quoteId || !isUuid(quoteId)) {
            throw new BadRequestError('Valid Quote ID is required.');
        }
        // --- End Validation ---

        try {
            const lessonId = await this.prisma.$transaction(async (tx) => {
                // 1. Check if the quote exists
                const quote = await tx.lessonQuote.findUnique({
                    where: { id: quoteId },
                    select: { id: true } // Only need to know if it exists
                });

                if (!quote) {
                    throw new NotFoundError(`Quote with ID ${quoteId} not found`);
                }

                // 2. Check if a lesson already exists for this quote
                const existingLesson = await tx.lesson.findUnique({
                    where: { quoteId: quoteId }, // Use the unique index on quoteId
                    select: { id: true } // Only need to know if it exists
                });

                if (existingLesson) {
                    throw new ConflictError(`Quote with ID ${quoteId} is already associated with lesson ${existingLesson.id}`);
                }

                // 3. Create the new lesson
                const currentLessonId = uuidv4();
                await tx.lesson.create({
                    data: {
                        id: currentLessonId,
                        quoteId: quote.id,
                    }
                });

                await this.updateStatusInternal(
                    tx,
                    currentLessonId,
                    LessonStatusValue.REQUESTED,
                    {}
                );

                return currentLessonId;
            });

            // Fetch the created lesson AFTER the transaction
            const createdLessonData = await this.prisma.lesson.findUniqueOrThrow({
                where: { id: lessonId },
                include: lessonIncludeForMapper
            });

            const lessonModel = LessonMapper.toModel(createdLessonData as unknown as DbLessonWithNestedRelations);

            if (!lessonModel) {
                console.error(`Failed to instantiate Lesson model from DB data for supposedly created lesson ID: ${lessonId}`);
                throw new AppError(`Data integrity issue: Failed to create Lesson model for ID ${lessonId}`, 500);
            }

            return lessonModel;

        } catch (error) {
            // Re-throw known errors, wrap others
            if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof AppError) {
                throw error;
            }
            console.error(`Unexpected error creating lesson from quote ${quoteId}:`, error);
            // Wrap unexpected errors
            throw new AppError(`Failed to create lesson from quote ${quoteId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
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
        transition: any, // Accept any initially for validation
        context: Record<string, unknown> = {},
        authenticatedUserId?: string
    ): Promise<Lesson | null> {
        // --- Validation ---
        if (!lessonId || !isUuid(lessonId)) {
            throw new BadRequestError('Valid Lesson ID is required.');
        }
        // Validate transition input type and value
        if (typeof transition !== 'string' || !(transition in LessonStatusTransition)) {
            throw new BadRequestError(`Invalid transition value: ${transition}. Must be one of ${Object.keys(LessonStatusTransition).join(', ')}`);
        }
        // Validate context (if provided)
        if (context !== null && typeof context !== 'object') {
            throw new BadRequestError('Invalid context format. Must be a JSON object or null.');
        }
        // Validate authenticated user presence
        if (!authenticatedUserId) {
            // This might indicate an auth middleware issue upstream, but service should check
            throw new AuthorizationError('Authentication required to update lesson status.');
        }
        // --- End Validation ---

        const validTransition = transition as LessonStatusTransition; // Cast after validation

        try {
            return await this.prisma.$transaction(async (tx) => {
                const currentLesson = await tx.lesson.findUnique({
                    where: { id: lessonId },
                    select: {
                        currentStatusId: true,
                        quote: { select: { teacherId: true } }
                    }
                });

                if (!currentLesson) {
                    // Throw NotFoundError if lesson itself doesn't exist
                    throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
                }

                // Authorization check (Only teacher associated with the quote can update status)
                if (!authenticatedUserId || currentLesson.quote?.teacherId !== authenticatedUserId) {
                    // Throw AuthorizationError for wrong user
                    throw new AuthorizationError('Forbidden: Only the assigned teacher can update the lesson status.');
                }

                if (!currentLesson.currentStatusId) {
                    // This indicates a data integrity issue
                    console.error(`Data Integrity Issue: Lesson ${lessonId} has null currentStatusId.`);
                    // Use AppError for internal server issues, which defaults to 500
                    throw new AppError(`Lesson ${lessonId} is missing status information.`, 500);
                }

                const currentStatusRecord = await tx.lessonStatus.findUnique({
                    where: { id: currentLesson.currentStatusId }
                });

                if (!currentStatusRecord) {
                    // This also indicates a data integrity issue
                    console.error(`Data Integrity Issue: currentStatusId ${currentLesson.currentStatusId} for lesson ${lessonId} not found in LessonStatus table.`);
                    throw new AppError(`Lesson ${lessonId} has invalid status information.`, 500);
                }

                const currentStatusValue = currentStatusRecord.status as LessonStatusValue;

                // Validate the requested transition using the state machine logic
                const newStatusValue = LessonStatus.getResultingStatus(currentStatusValue, validTransition);
                if (!newStatusValue) {
                    // Throw BadRequestError for invalid state transitions
                    throw new BadRequestError(`Invalid transition: Cannot transition from ${currentStatusValue} using ${validTransition}.`);
                }

                await this.updateStatusInternal(tx, lessonId, newStatusValue, context);

                const updatedLessonData = await tx.lesson.findUniqueOrThrow({
                    where: { id: lessonId },
                    include: lessonIncludeForMapper
                });

                return LessonMapper.toModel(updatedLessonData as unknown as DbLessonWithNestedRelations);
            });
        } catch (error) {
            // Re-throw known errors, wrap others
            if (error instanceof BadRequestError || error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof AppError) {
                throw error; // Re-throw specific errors
            }
            // Log and wrap unexpected errors as AppError (500)
            console.error(`Unexpected error updating status for lesson ${lessonId} via transition ${transition}:`, error);
            throw new AppError(`Failed to update lesson status: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }

    /**
     * Finds lessons based on provided filters (teacherId or quoteId).
     * Handles authorization based on the filter.
     * @param options - Filtering options including teacherId or quoteId, and requestingUserId for quoteId filter.
     * @returns A promise resolving to an array of Lesson shared models.
     */
    async findLessons(options: FindLessonsOptions): Promise<Lesson[]> {
        const { teacherId, quoteId, requestingUserId } = options;

        // --- Validation ---
        // Exclusivity check (already done in controller, but good practice here too)
        if ((!teacherId && !quoteId) || (teacherId && quoteId)) {
            throw new BadRequestError('Exactly one of teacherId or quoteId query parameter must be provided.');
        }
        // ID format and presence checks
        if (teacherId && (typeof teacherId !== 'string' || !isUuid(teacherId))) {
            throw new BadRequestError('Invalid Teacher ID format provided.');
        }
        if (quoteId && (typeof quoteId !== 'string' || !isUuid(quoteId))) {
            throw new BadRequestError('Invalid Quote ID format provided.');
        }
        // Check requestingUserId if filtering by quoteId
        if (quoteId && !requestingUserId) {
            throw new BadRequestError('Requesting user ID is required when filtering by quote ID.');
        }
        // --- End Validation ---

        let whereClause: Prisma.LessonWhereInput = {};
        let lessonsData: PrismaLesson[] = [];

        if (teacherId) {
            // Authorization already handled in controller for teacherId
            whereClause = { quote: { teacherId: teacherId } };
            lessonsData = await this.prisma.lesson.findMany({
                where: whereClause,
                include: lessonIncludeForMapper,
                orderBy: { createdAt: 'desc' } // Optional: Add default ordering
            });
        } else if (quoteId) {
            whereClause = { quoteId: quoteId };
            lessonsData = await this.prisma.lesson.findMany({
                where: whereClause,
                include: lessonIncludeForMapper,
                orderBy: { createdAt: 'desc' } // Optional: Add default ordering
            });

            // Authorization Check for quoteId filter
            if (lessonsData.length > 0) {
                // All lessons fetched by quoteId will share the same quote, check the first one
                const firstLesson = await this.prisma.lesson.findUnique({
                    where: { id: lessonsData[0].id },
                    select: {
                        quote: {
                            select: {
                                teacherId: true,
                                lessonRequest: { select: { studentId: true } }
                            }
                        }
                    }
                });
                const studentId = firstLesson?.quote?.lessonRequest?.studentId;
                const lessonTeacherId = firstLesson?.quote?.teacherId;
                if (requestingUserId !== studentId && requestingUserId !== lessonTeacherId) {
                    // Throw error if user is not associated with the quote
                    throw new AuthorizationError('User is not authorized to view lessons for this quote.');
                }
                // If authorized, lessonsData is already correct
            } else {
                // No lessons found for the quote, return empty array (no auth check needed)
            }
        } else {
            // Should be caught by controller validation
            throw new BadRequestError('Either teacherId or quoteId must be provided to find lessons.');
        }

        // Map and filter nulls
        return lessonsData
            .map(lesson => LessonMapper.toModel(lesson as unknown as DbLessonWithNestedRelations))
            .filter((lesson): lesson is Lesson => lesson !== null);
    }

    /**
     * Get a lesson by ID, checking authorization.
     * @param lessonId The ID of the lesson to fetch.
     * @param requestingUserId The ID of the user making the request.
     * @returns The shared Lesson model instance or null if not found or not authorized.
     * @throws {NotFoundError} If the lesson itself is not found.
     * @throws {AuthorizationError} If the user is not authorized.
     */
    async getLessonById(lessonId: string, requestingUserId: string): Promise<Lesson | null> {
        // --- Validation ---
        if (!lessonId || !isUuid(lessonId)) {
            throw new BadRequestError('Valid Lesson ID is required.');
        }
        if (!requestingUserId) {
            throw new BadRequestError('Requesting user ID is required for authorization.');
        }
        // --- End Validation ---

        try {
            const lessonData = await this.prisma.lesson.findUnique({
                where: { id: lessonId },
                include: lessonIncludeForMapper // Use the include for mapping AND auth check
            });

            if (!lessonData) {
                // Return null if lesson not found, controller handles 404
                return null;
            }

            // Authorization check
            const studentId = lessonData.quote?.lessonRequest?.studentId;
            const teacherId = lessonData.quote?.teacherId;

            if (requestingUserId !== studentId && requestingUserId !== teacherId) {
                // Don't throw error, just return null to indicate not found *for this user*
                // Controller can return 404 in this case as well.
                console.warn(`Auth check failed: User ${requestingUserId} tried to access lesson ${lessonId} owned by Student: ${studentId}, Teacher: ${teacherId}`);
                return null;
            }

            // If authorized, use mapper to instantiate and return the model
            return LessonMapper.toModel(lessonData as unknown as DbLessonWithNestedRelations);
        } catch (error) {
            console.error(`Error fetching lesson ${lessonId}:`, error);
            throw new AppError(`Failed to fetch lesson: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }

    /**
     * Get lessons by quote ID - DEPRECATED (use findLessons)
     * Kept temporarily for reference if needed, should be removed.
     * @param quoteId The ID of the quote
     * @returns Array of shared Lesson model instances
     */
    /*
    async getLessonsByQuoteId(quoteId: string): Promise<Lesson[]> {
        try {
            const lessonsData = await this.prisma.lesson.findMany({
                where: { quoteId },
                include: lessonIncludeForMapper
            });
            return lessonsData
                .map(data => LessonMapper.toModel(data as unknown as DbLessonWithNestedRelations))
                .filter((lesson): lesson is Lesson => lesson !== null);
        } catch (error) {
            console.error(`Error fetching lessons for quote ${quoteId}:`, error);
            throw new AppError(`Failed to fetch lessons by quote: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    */

    /**
    * Find all lessons associated with a specific teacher - DEPRECATED (use findLessons)
    * Kept temporarily for reference if needed, should be removed.
    */
    /*
    async findLessonsByTeacherId(teacherId: string): Promise<Lesson[]> {
        if (!teacherId) {
            throw new BadRequestError('Teacher ID is required to find lessons.');
        }
        try {
            const prismaLessons = await this.prisma.lesson.findMany({
                where: {
                    quote: { 
                        teacherId: teacherId,
                    }
                },
                include: lessonIncludeForMapper
            });
            const sharedLessons = prismaLessons
                .map(lesson => LessonMapper.toModel(lesson as unknown as DbLessonWithNestedRelations))
                .filter((lesson): lesson is Lesson => lesson !== null);

            return sharedLessons;
        } catch (error) {
            console.error(`Error finding lessons for teacher ${teacherId}:`, error);
            throw new AppError('Failed to fetch lessons by teacher ID.', 500);
        }
    }
    */

}

// Export singleton instance
export const lessonService = new LessonService(prisma); 