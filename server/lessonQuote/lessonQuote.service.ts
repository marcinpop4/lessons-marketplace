import prisma from '../prisma.js';
import type { PrismaClient } from '@prisma/client';
import { LessonType } from '../../shared/models/LessonType.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { Student } from '../../shared/models/Student.js';
import { Address } from '../../shared/models/Address.js';
import { Prisma } from '@prisma/client';
import { LessonQuoteMapper } from './lessonQuote.mapper.js';
import { TeacherMapper } from '../teacher/teacher.mapper.js';
import { LessonRequestMapper } from '../lessonRequest/lessonRequest.mapper.js';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
import { TeacherLessonHourlyRateStatusValue } from '@shared/models/TeacherLessonHourlyRateStatus.js';
import { BadRequestError, NotFoundError, AuthorizationError, ConflictError, AppError } from '../errors/index.js';
import { isUuid } from '../utils/validation.utils.js';
import { lessonService } from '../lesson/lesson.service.js';
import { UserType as PrismaUserType } from '@prisma/client';
import { UserType as SharedUserType } from '@shared/models/UserType.js';

// Define Prisma types for includes required by mapper methods
// Type for Teacher with nested rates
type DbTeacherWithRates = Prisma.TeacherGetPayload<{ include: { teacherLessonHourlyRates: true } }>;
// Type for LessonRequest with nested student and address
type DbLessonRequestWithRelations = Prisma.LessonRequestGetPayload<{ include: { student: true, address: true } }>;
// Type for LessonQuote with nested relations needed for mapping
type DbLessonQuoteWithRelations = Prisma.LessonQuoteGetPayload<{
    include: {
        teacher: { include: { teacherLessonHourlyRates: true } },
        lessonRequest: { include: { student: true, address: true } },
        currentStatus: true,
    }
}>;

// Type for the quote needed for update checks
type DbLessonQuoteForUpdateCheck = Prisma.LessonQuoteGetPayload<{
    include: {
        lessonRequest: { select: { studentId: true } };
        Lesson: { select: { id: true } }; // Assuming Lesson relation exists?
        teacher: { select: { id: true } };
        currentStatus: true; // Restore currentStatus include
    };
}>;

class LessonQuoteService {
    private readonly prisma = prisma;

    /**
     * Create a single lesson quote and its initial status record within a transaction.
     * @param quoteData - Data for creating the quote
     * @returns The created LessonQuote shared model instance or null on error
     */
    async create(quoteData: {
        lessonRequestId: string;
        teacherId: string;
        costInCents: number;
        hourlyRateInCents: number;
    }): Promise<LessonQuote | null> {
        // --- Validation ---
        if (!quoteData.lessonRequestId || !isUuid(quoteData.lessonRequestId)) {
            throw new BadRequestError('Valid Lesson Request ID is required.');
        }
        if (!quoteData.teacherId || !isUuid(quoteData.teacherId)) {
            throw new BadRequestError('Valid Teacher ID is required.');
        }
        if (typeof quoteData.costInCents !== 'number' || !Number.isInteger(quoteData.costInCents) || quoteData.costInCents < 0) {
            // Allow 0 for free lessons? Assume >= 0 for now.
            throw new BadRequestError('Cost must be a non-negative integer.');
        }
        if (typeof quoteData.hourlyRateInCents !== 'number' || !Number.isInteger(quoteData.hourlyRateInCents) || quoteData.hourlyRateInCents <= 0) {
            throw new BadRequestError('Hourly rate must be a positive integer.');
        }
        // TODO: Add check if teacher exists?
        // TODO: Add check if lesson request exists? (Handled by Prisma FK constraint, but explicit check is clearer)
        // --- End Validation ---

        let createdQuoteId: string | null = null;
        try {
            // Follow the workflow: Create Quote -> Create Status -> Update Quote Status Link
            await this.prisma.$transaction(async (tx) => {
                // Optional: Explicit check if Lesson Request exists
                const lessonRequest = await tx.lessonRequest.findUnique({ where: { id: quoteData.lessonRequestId } });
                if (!lessonRequest) {
                    throw new NotFoundError(`Lesson Request with ID ${quoteData.lessonRequestId} not found.`);
                }

                // 1. Create the LessonQuote (currentStatusId will be null initially)
                const newDbQuote = await tx.lessonQuote.create({
                    data: {
                        lessonRequestId: quoteData.lessonRequestId,
                        teacherId: quoteData.teacherId,
                        costInCents: quoteData.costInCents,
                        hourlyRateInCents: quoteData.hourlyRateInCents,
                        // currentStatusId is omitted, defaults according to schema (likely null)
                    },
                });
                createdQuoteId = newDbQuote.id; // Capture the ID

                // 2. Create the initial LessonQuoteStatus, connecting back to the quote
                const initialStatus = await tx.lessonQuoteStatus.create({
                    data: {
                        status: LessonQuoteStatusValue.CREATED,
                        lessonQuote: { // Explicitly connect to the quote created in step 1
                            connect: { id: newDbQuote.id },
                        },
                        // context: null // Optional
                    },
                });

                // 3. Update the LessonQuote to link its currentStatusId to the new status
                await tx.lessonQuote.update({
                    where: { id: newDbQuote.id },
                    data: {
                        currentStatusId: initialStatus.id,
                    },
                });
            });

            if (!createdQuoteId) {
                throw new Error(
                    "Transaction completed but quote ID was not captured."
                );
            }

            // Fetch the complete quote record post-transaction, including the status
            const finalDbQuote = await this.prisma.lessonQuote.findUniqueOrThrow(
                {
                    where: { id: createdQuoteId },
                    include: {
                        teacher: {
                            include: { teacherLessonHourlyRates: true },
                        },
                        lessonRequest: {
                            include: { student: true, address: true },
                        },
                        currentStatus: true, // Include the linked status
                    },
                }
            );

            // Pass the full object including status to the mapper
            return LessonQuoteMapper.toModel(
                finalDbQuote as DbLessonQuoteWithRelations
            );
        } catch (error) {
            // Check if error is PrismaClientKnownRequestError and log code if so
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                console.error("Prisma Error in LessonQuoteService.create:", error.code, error.message);
            } else {
                console.error("Error in LessonQuoteService.create:", error);
            }
            // Rethrow or handle as appropriate for your error strategy
            throw error;
        }
    }

    /**
     * Get available teachers for a lesson type
     * @param lessonType - Type of lesson
     * @returns Array of available teachers (shared models)
     */
    async getAvailableTeachers(lessonType: LessonType): Promise<Teacher[]> {
        // Validate lessonType enum value
        if (!Object.values(LessonType).includes(lessonType)) {
            throw new BadRequestError(`Invalid lesson type: ${lessonType}`);
        }

        // Fetch teachers who have an ACTIVE rate for the specified lesson type.
        const dbTeachersWithActiveRates = await this.prisma.teacher.findMany({
            where: {
                // Check if the teacher has *at least one* rate matching the criteria
                teacherLessonHourlyRates: {
                    some: {
                        type: lessonType,
                        // Filter by the status relation
                        currentStatus: {
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    }
                }
            },
            include: {
                // Include ONLY the rates that match the criteria for the mapper
                teacherLessonHourlyRates: {
                    where: {
                        type: lessonType,
                        currentStatus: {
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    },
                    include: { currentStatus: true } // Include status for the rate itself if mapper needs it
                }
            },
            take: 5 // Keep the limit
        });

        // Map using the fetched teachers and their *filtered* rates
        return dbTeachersWithActiveRates.map(dbTeacher =>
            TeacherMapper.toModel(dbTeacher, dbTeacher.teacherLessonHourlyRates) // Pass the included rates
        );
    }

    /**
     * Get a specific lesson quote including its current status relation.
     * Used for authorization checks and status updates.
     * Renamed from getQuoteForAcceptanceCheck to getQuoteForUpdateCheck.
     * @param quoteId
     * @returns Lesson quote with nested lesson request student ID, teacher ID, and current status, or null
     */
    async getQuoteForUpdateCheck(quoteId: string): Promise<DbLessonQuoteForUpdateCheck | null> {
        // --- Validation ---
        if (!quoteId || !isUuid(quoteId)) {
            throw new BadRequestError('Valid Quote ID is required.');
        }
        // --- End Validation ---

        try {
            const quote = await this.prisma.lessonQuote.findUnique({
                where: { id: quoteId },
                include: {
                    lessonRequest: { select: { studentId: true } },
                    Lesson: { select: { id: true } }, // Keep for now
                    teacher: { select: { id: true } },
                    currentStatus: true, // Restore include
                },
            });
            return quote;
        } catch (error) {
            console.error(
                `Error fetching quote ${quoteId} for update check:`,
                error
            );
            throw new Error(
                `Failed to fetch quote: ${error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get a specific lesson quote with minimal related data for acceptance checks.
     * Returns raw Prisma data.
     * @param quoteId - ID of the lesson quote
     * @returns Lesson quote with nested lesson request student ID and lesson ID, or null
     */
    async getQuoteForAcceptanceCheck(quoteId: string): Promise<Prisma.LessonQuoteGetPayload<{ include: { lessonRequest: { select: { studentId: true } }, Lesson: { select: { id: true } } } }> | null> {
        // --- Validation ---
        if (!quoteId || !isUuid(quoteId)) {
            throw new BadRequestError('Valid Quote ID is required.');
        }
        // --- End Validation ---

        try {
            return await this.prisma.lessonQuote.findUnique({
                where: { id: quoteId },
                include: {
                    lessonRequest: { select: { studentId: true } }, // Select only needed field
                    Lesson: { select: { id: true } } // Check if a lesson already exists
                }
            });
        } catch (error) {
            console.error(`Error fetching quote ${quoteId} for acceptance check:`, error);
            throw new Error(`Failed to fetch quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get all quotes for a lesson request
     * @param lessonRequestId - ID of the lesson request
     * @returns Array of LessonQuote shared model instances
     */
    async getQuotesByLessonRequest(lessonRequestId: string): Promise<LessonQuote[]> {
        // --- Validation ---
        if (!lessonRequestId || !isUuid(lessonRequestId)) {
            throw new BadRequestError('Valid Lesson Request ID is required.');
        }
        // --- End Validation ---

        // --- Check if Lesson Request Exists ---
        const requestExists = await this.prisma.lessonRequest.findUnique({
            where: { id: lessonRequestId },
            select: { id: true } // Only need to know if it exists
        });
        if (!requestExists) {
            // Throw NotFoundError if the request ID itself is invalid
            throw new NotFoundError(`Lesson request with ID ${lessonRequestId} not found.`);
        }
        // --- End Check ---

        // Restore currentStatus include
        const dbQuotes = await this.prisma.lessonQuote.findMany({
            where: { lessonRequestId },
            include: {
                teacher: { include: { teacherLessonHourlyRates: true } },
                lessonRequest: { include: { student: true, address: true } },
                currentStatus: true, // Restore include
            },
            orderBy: { createdAt: "desc" },
        });

        // Pass the full object including status to the mapper
        // Mapper needs adjustment if it doesn't handle status
        return dbQuotes.map((dbQuote) =>
            LessonQuoteMapper.toModel(dbQuote as DbLessonQuoteWithRelations)
        );
    }

    /**
     * Updates the status of a lesson quote, performing validation, authorization,
     * state transition checks, and potentially creating a lesson.
     *
     * @param quoteId ID of the quote to update.
     * @param newStatus The target status value.
     * @param context Optional context for the status change.
     * @param userId ID of the user performing the action.
     * @param userType Type of the user performing the action.
     * @returns The updated LessonQuote shared model.
     * @throws Various errors (BadRequest, NotFound, Auth, Conflict, AppError).
     */
    async updateStatus(
        quoteId: string,
        newStatus: any, // Validate type below
        context: Record<string, unknown> | null,
        userId: string,
        userType: any // Use actual UserType enum eventually
    ): Promise<LessonQuote> {

        // --- Validation ---
        if (!quoteId || !isUuid(quoteId)) {
            throw new BadRequestError('Valid Quote ID is required.');
        }
        if (!newStatus || !Object.values(LessonQuoteStatusValue).includes(newStatus)) {
            throw new BadRequestError(`Invalid or missing status value. Must be one of: ${Object.values(LessonQuoteStatusValue).join(', ')}`);
        }
        const validNewStatus = newStatus as LessonQuoteStatusValue;
        if (context !== null && typeof context !== 'object') {
            throw new BadRequestError('Invalid context format. Must be a JSON object or null.');
        }
        if (!userId) { // userType checked below
            throw new AuthorizationError('User ID is required for authorization.');
        }
        // TODO: Replace `any` with actual UserType enum import
        // if (!userType || !Object.values(UserType).includes(userType)) {
        //     throw new AuthorizationError('Valid User Type is required for authorization.');
        // }
        // --- End Validation ---

        try {
            const updatedQuote = await this.prisma.$transaction(async (tx) => {
                // Fetch current quote with necessary relations for checks
                const currentQuote = await tx.lessonQuote.findUnique({
                    where: { id: quoteId },
                    include: {
                        currentStatus: true,
                        lessonRequest: { select: { studentId: true } },
                        teacher: { select: { id: true } }, // Need teacherId for auth
                        Lesson: { select: { id: true } } // Check if lesson exists
                    }
                });

                // Add detailed logging HERE, immediately after fetching
                // console.log(`[AuthCheck-Early] Fetched quote for update: quoteId=${currentQuote?.id}, status=${currentQuote?.currentStatus?.status}`);
                // console.log(`[AuthCheck-Early] userId (from token): ${userId}`);
                // console.log(`[AuthCheck-Early] userType (from token): ${userType}`);
                // console.log(`[AuthCheck-Early] quote.lessonRequest.studentId: ${currentQuote?.lessonRequest?.studentId}`);
                // console.log(`[AuthCheck-Early] quote.teacherId: ${currentQuote?.teacherId}`);

                if (!currentQuote) {
                    throw new NotFoundError(`Quote with ID ${quoteId} not found.`);
                }
                if (!currentQuote.currentStatus) {
                    throw new AppError(`Data integrity issue: Quote ${quoteId} is missing current status.`, 500);
                }

                const currentStatusValue = currentQuote.currentStatus.status as LessonQuoteStatusValue;

                // --- Conflict Check (PRIORITIZE for ACCEPT) ---
                if (validNewStatus === LessonQuoteStatusValue.ACCEPTED && currentQuote.Lesson) {
                    throw new ConflictError(`Conflict: Quote ${quoteId} has already been accepted and linked to Lesson ${currentQuote.Lesson.id}.`);
                }

                // --- Authorization Check ---
                // Logging from previous step (keep for now) - compare against SharedUserType
                // console.log(`[AuthCheck] userType === SharedUserType.STUDENT: ${userType === SharedUserType.STUDENT}`);
                // console.log(`[AuthCheck] currentQuote.lessonRequest?.studentId === userId: ${currentQuote.lessonRequest?.studentId === userId}`);

                // Ensure comparison uses SharedUserType (the alias)
                const isStudentOwner = userType === SharedUserType.STUDENT && currentQuote.lessonRequest?.studentId === userId;
                const isTeacherOwner = userType === SharedUserType.TEACHER && currentQuote.teacherId === userId;

                if (!isStudentOwner && !isTeacherOwner) {
                    throw new AuthorizationError('Forbidden: You are not authorized to update this quote.');
                }

                // --- State Transition Validation (Simple - enhance with state machine class if needed) ---
                // TODO: Replace with a proper state machine logic if complex transitions arise
                let allowed = false;
                if (isStudentOwner) {
                    if (currentStatusValue === LessonQuoteStatusValue.CREATED &&
                        (validNewStatus === LessonQuoteStatusValue.ACCEPTED || validNewStatus === LessonQuoteStatusValue.REJECTED)) {
                        allowed = true;
                    }
                } else if (isTeacherOwner) {
                    // Add allowed transitions for TEACHER if any
                    // Example (if WITHDRAWN status existed):
                    // if (currentStatusValue === LessonQuoteStatusValue.CREATED && validNewStatus === LessonQuoteStatusValue.WITHDRAWN) {
                    //     allowed = true;
                    // }
                    // Add other real teacher transitions here if needed in the future
                }

                if (!allowed) {
                    throw new BadRequestError(`Invalid status transition: Cannot move from ${currentStatusValue} to ${validNewStatus} by user type ${userType}.`);
                }

                // --- Perform Actions ---
                let createdLessonId: string | null = null;
                // 1. Create Lesson if Student is Accepting
                if (validNewStatus === LessonQuoteStatusValue.ACCEPTED && isStudentOwner) {
                    // Call lessonService.create within the transaction
                    // Need to ensure lessonService.create accepts the transaction client (tx)
                    // Assuming lessonService.create handles its own checks (quote exists, not used)
                    const lesson = await lessonService.create(quoteId); // Pass quoteId
                    createdLessonId = lesson.id;
                    // Note: lessonService.create should ideally set the quote status implicitly or return info needed
                }

                // 2. Create new LessonQuoteStatus
                const newStatusRecord = await tx.lessonQuoteStatus.create({
                    data: {
                        lessonQuoteId: quoteId,
                        status: validNewStatus,
                        // Cast context to satisfy Prisma's InputJsonValue requirement
                        context: (context ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                    }
                });

                // 3. Update LessonQuote currentStatusId
                await tx.lessonQuote.update({
                    where: { id: quoteId },
                    data: { currentStatusId: newStatusRecord.id },
                });

                // Refetch the updated quote with full relations for return
                const finalDbQuote = await tx.lessonQuote.findUniqueOrThrow({
                    where: { id: quoteId },
                    include: {
                        teacher: { include: { teacherLessonHourlyRates: true } },
                        lessonRequest: { include: { student: true, address: true } },
                        currentStatus: true,
                    }
                });
                return finalDbQuote;

            }); // End Transaction

            return LessonQuoteMapper.toModel(updatedQuote as DbLessonQuoteWithRelations);

        } catch (error) {
            // Re-throw known errors
            if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof ConflictError || error instanceof AppError) {
                throw error;
            }
            // Log and wrap unknown errors
            console.error(`Unexpected error updating status for quote ${quoteId} to ${newStatus}:`, error);
            throw new AppError(`Failed to update quote status: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
}

// Export a singleton instance
export const lessonQuoteService = new LessonQuoteService(); 