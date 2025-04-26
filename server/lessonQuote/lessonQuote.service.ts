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
        let createdQuoteId: string | null = null;
        try {
            // Follow the workflow: Create Quote -> Create Status -> Update Quote Status Link
            await this.prisma.$transaction(async (tx) => {
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
        const dbTeachers = await this.prisma.teacher.findMany({
            where: {
                teacherLessonHourlyRates: {
                    some: { type: lessonType, deactivatedAt: null }
                }
            },
            include: {
                teacherLessonHourlyRates: { where: { type: lessonType, deactivatedAt: null } }
            },
            take: 5
        });

        // Use TeacherMapper instead of static method
        return dbTeachers.map(dbTeacher =>
            TeacherMapper.toModel(dbTeacher, dbTeacher.teacherLessonHourlyRates)
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
}

// Export a singleton instance
export const lessonQuoteService = new LessonQuoteService(); 