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
import { teacherService } from '../teacher/teacher.service.js';
import { v4 as uuidv4 } from 'uuid';
import { LessonQuoteStatus } from '@shared/models/LessonQuoteStatus.js';

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
    }): Promise<LessonQuote> {
        // --- Validation ---
        if (!quoteData.lessonRequestId || !isUuid(quoteData.lessonRequestId)) {
            throw new BadRequestError('Valid Lesson Request ID is required.');
        }
        if (!quoteData.teacherId || !isUuid(quoteData.teacherId)) {
            throw new BadRequestError('Valid Teacher ID is required.');
        }
        if (typeof quoteData.costInCents !== 'number' || !Number.isInteger(quoteData.costInCents) || quoteData.costInCents < 0) {
            throw new BadRequestError('Cost must be a non-negative integer.');
        }
        if (typeof quoteData.hourlyRateInCents !== 'number' || !Number.isInteger(quoteData.hourlyRateInCents) || quoteData.hourlyRateInCents <= 0) {
            throw new BadRequestError('Hourly rate must be a positive integer.');
        }

        let createdQuoteId: string | null = null;
        try {
            await this.prisma.$transaction(async (tx) => {
                const lessonRequest = await tx.lessonRequest.findUnique({ where: { id: quoteData.lessonRequestId } });
                if (!lessonRequest) {
                    throw new NotFoundError(`Lesson Request with ID ${quoteData.lessonRequestId} not found.`);
                }
                // Optional: Add check if teacher exists
                const teacher = await tx.teacher.findUnique({ where: { id: quoteData.teacherId } });
                if (!teacher) {
                    throw new NotFoundError(`Teacher with ID ${quoteData.teacherId} not found.`);
                }

                // 1. Create the LessonQuote
                const newDbQuote = await tx.lessonQuote.create({
                    data: {
                        lessonRequestId: quoteData.lessonRequestId,
                        teacherId: quoteData.teacherId,
                        costInCents: quoteData.costInCents,
                        hourlyRateInCents: quoteData.hourlyRateInCents,
                    },
                });
                createdQuoteId = newDbQuote.id;

                // 2. Create the initial LessonQuoteStatus
                const initialStatus = await tx.lessonQuoteStatus.create({
                    data: {
                        status: LessonQuoteStatusValue.CREATED,
                        lessonQuote: { connect: { id: newDbQuote.id } },
                    },
                });

                // 3. Update the LessonQuote to link its currentStatusId
                await tx.lessonQuote.update({
                    where: { id: newDbQuote.id },
                    data: { currentStatusId: initialStatus.id },
                });
            });

            if (!createdQuoteId) {
                // This case should ideally not happen if transaction succeeds without error
                throw new AppError('Lesson quote creation failed unexpectedly after transaction.', 500);
            }

            const finalDbQuote = await this.prisma.lessonQuote.findUniqueOrThrow({
                where: { id: createdQuoteId },
                include: {
                    teacher: { include: { teacherLessonHourlyRates: true } }, // Include rates for mapping
                    lessonRequest: { include: { student: true, address: true } },
                    currentStatus: true,
                },
            });

            return LessonQuoteMapper.toModel(finalDbQuote as DbLessonQuoteWithRelations);
        } catch (error) {
            // Handle specific Prisma errors if needed (e.g., unique constraints)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Example: A quote might already exist for this teacher/request combination?
                throw new ConflictError('A quote for this teacher and lesson request may already exist.');
            }
            console.error("Error in LessonQuoteService.create:", error);
            // Rethrow other errors (NotFound, BadRequest, AppError, generic errors)
            throw error;
        }
    }

    /**
     * Generates and creates lesson quotes for a given lesson request.
     * Finds available teachers, calculates costs, and creates quotes using the `create` method.
     * @param lessonRequestId - The ID of the lesson request.
     * @param lessonType - The type of lesson requested.
     * @returns An array of created LessonQuote shared models.
     */
    async generateAndCreateQuotes(lessonRequestId: string, lessonType: LessonType): Promise<LessonQuote[]> {
        // --- Validation ---
        if (!lessonRequestId || !isUuid(lessonRequestId)) {
            throw new BadRequestError('Valid Lesson Request ID is required.');
        }
        if (!lessonType || !Object.values(LessonType).includes(lessonType)) {
            throw new BadRequestError(`Invalid lesson type provided: ${lessonType}`);
        }

        // --- Fetch necessary data ---
        // 1. Get the lesson request details (needed for duration)
        const lessonRequest = await this.prisma.lessonRequest.findUnique({
            where: { id: lessonRequestId },
            // select: { durationMinutes: true }, // Only select needed fields
        });
        if (!lessonRequest) {
            throw new NotFoundError(`Lesson Request with ID ${lessonRequestId} not found.`);
        }
        const durationMinutes = lessonRequest.durationMinutes;

        // 2. Find available teachers with active rates for this lesson type
        // Using the teacherService method which already handles finding active rates
        // Use a reasonable limit, e.g., 5, or make it configurable if needed
        const availableTeachers = await teacherService.findTeachersByLessonType(lessonType, 5);

        if (availableTeachers.length === 0) {
            console.log(`No available teachers found for lesson type: ${lessonType}`);
            return []; // Return empty array if no teachers are available
        }

        // --- Generate and Create Quotes ---
        const createdQuotes: LessonQuote[] = [];
        const quoteCreationPromises: Promise<LessonQuote | null>[] = [];

        for (const teacher of availableTeachers) {
            // Find the specific rate for the requested lesson type
            // Use the 'hourlyRates' property from the shared Teacher model
            const rate = teacher.hourlyRates.find(
                (r: TeacherLessonHourlyRate) => r.type === lessonType && r.currentStatus?.status === TeacherLessonHourlyRateStatusValue.ACTIVE
            );

            if (rate) {
                const hourlyRateInCents = rate.rateInCents;
                // Calculate cost based on the rate and lesson request duration
                const costInCents = Math.round((hourlyRateInCents * durationMinutes) / 60.0);

                // Create quote using the existing `create` method
                // Push the promise returned by `create` to the array
                quoteCreationPromises.push(
                    this.create({
                        lessonRequestId,
                        teacherId: teacher.id,
                        costInCents,
                        hourlyRateInCents,
                    })
                        .catch(error => {
                            // Log error for this specific quote creation but don't stop others
                            console.error(`Failed to create quote for teacher ${teacher.id} and request ${lessonRequestId}:`, error);
                            return null; // Return null on failure for filtering later
                        })
                );
            } else {
                // This shouldn't happen if findTeachersByLessonType works correctly
                // and includes the active rate used for filtering.
                console.warn(`Teacher ${teacher.id} was returned by findTeachersByLessonType but no active rate found for ${lessonType}. Check TeacherMapper logic.`);
            }
        }

        // Wait for all quote creation attempts to settle (succeed or fail)
        const results = await Promise.allSettled(quoteCreationPromises);

        // Filter out failures (nulls) and extract successful quotes
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                createdQuotes.push(result.value);
            }
            // Optionally log failures from settled promises if needed
            // if (result.status === 'rejected') { ... }
        }

        return createdQuotes;
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
        newStatus: LessonQuoteStatusValue,
        context: Record<string, unknown> | null,
        userId: string,
        userType: SharedUserType
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
                const quote = await tx.lessonQuote.findUniqueOrThrow({
                    where: { id: quoteId },
                    include: {
                        lessonRequest: { select: { studentId: true } },
                        Lesson: { select: { id: true } },
                        teacher: { select: { id: true } },
                        currentStatus: true,
                    },
                });

                if (!quote.currentStatus) {
                    throw new AppError('Lesson quote is missing current status information.', 500);
                }
                const currentStatusValue = quote.currentStatus.status as LessonQuoteStatusValue;
                // validNewStatus already validated in the initial checks

                // --- Authorization Checks based on ROLE and ACTION ---
                const isStudentOwner = userType === SharedUserType.STUDENT && quote.lessonRequest?.studentId === userId;
                const isTeacherOwner = userType === SharedUserType.TEACHER && quote.teacherId === userId;

                if (validNewStatus === LessonQuoteStatusValue.ACCEPTED) {
                    // Only the specific student who owns the request can ACCEPT
                    if (!isStudentOwner) {
                        throw new AuthorizationError('Only the requesting student can accept a lesson quote.');
                    }
                    // Check if a lesson has already been created for this quote
                    if (quote.Lesson) {
                        throw new BadRequestError('Cannot accept a quote that already has an associated lesson.');
                    }
                } else if (validNewStatus === LessonQuoteStatusValue.REJECTED) {
                    // Only the specific student who owns the request can REJECT
                    if (!isStudentOwner) {
                        throw new AuthorizationError('Only the requesting student can reject a lesson quote.');
                    }
                } else {
                    // If the target status is neither ACCEPTED nor REJECTED, and no other
                    // role-specific checks allow it, it's an invalid request.
                    // This covers the case where a student tries to move from ACCEPTED -> CREATED
                    throw new BadRequestError(`Invalid target status '${validNewStatus}' for this operation or user role.`);
                }
                // If no specific check matched/threw, proceed.

                // --- Perform Actions ---
                let createdLessonId: string | null = null;
                // 1. Create Lesson if Student is Accepting
                if (validNewStatus === LessonQuoteStatusValue.ACCEPTED && isStudentOwner) {
                    const lesson = await lessonService.create(quoteId);
                    createdLessonId = lesson.id;
                }

                // 2. Create new LessonQuoteStatus
                const newStatusRecord = await tx.lessonQuoteStatus.create({
                    data: {
                        lessonQuoteId: quoteId,
                        status: validNewStatus,
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
            // Catch Prisma P2025 specifically for NotFoundError
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // The .findUniqueOrThrow inside the transaction failed
                throw new NotFoundError(`Quote with ID ${quoteId} not found.`);
            }
            // Re-throw other known application errors
            if (error instanceof BadRequestError || error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof AppError) {
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