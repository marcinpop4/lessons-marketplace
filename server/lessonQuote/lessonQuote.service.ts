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

// Define Prisma types for includes required by mapper methods
// Type for Teacher with nested rates
type DbTeacherWithRates = Prisma.TeacherGetPayload<{ include: { teacherLessonHourlyRates: true } }>;
// Type for LessonRequest with nested student and address
type DbLessonRequestWithRelations = Prisma.LessonRequestGetPayload<{ include: { student: true, address: true } }>;

class LessonQuoteService {
    private readonly prisma = prisma;

    /**
     * Create a single lesson quote directly.
     * @param quoteData - Data for creating the quote
     * @returns The created LessonQuote shared model instance or null on error
     */
    async create(quoteData: {
        lessonRequestId: string;
        teacherId: string;
        costInCents: number;
        hourlyRateInCents: number;
    }): Promise<LessonQuote | null> {
        try {
            // Create the quote
            const dbQuote = await this.prisma.lessonQuote.create({
                data: {
                    lessonRequest: { connect: { id: quoteData.lessonRequestId } },
                    teacher: { connect: { id: quoteData.teacherId } },
                    costInCents: quoteData.costInCents,
                    hourlyRateInCents: quoteData.hourlyRateInCents
                },
                // Fetch relations needed for mapping
                include: {
                    teacher: { include: { teacherLessonHourlyRates: true } },
                    lessonRequest: { include: { student: true, address: true } }
                }
            });

            // Use mapper instead of static method
            return LessonQuoteMapper.toModel(dbQuote);

        } catch (error) {
            console.error('Error creating quote:', error);
            // Return null or re-throw depending on desired error handling
            // Returning null for consistency with other potential error paths
            return null;
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
     * Create quotes for a lesson request from available teachers
     * @param lessonRequestId - ID of the lesson request
     * @param lessonType - Type of lesson
     * @returns Array of created LessonQuote shared models
     */
    async createQuotesForLessonRequest(
        lessonRequestId: string,
        lessonType: LessonType
    ): Promise<LessonQuote[]> {
        const dbLessonRequest = await this.prisma.lessonRequest.findUnique({
            where: { id: lessonRequestId },
            include: {
                student: true,
                address: true
            }
        });

        if (!dbLessonRequest) {
            throw new Error(`Lesson request with ID ${lessonRequestId} not found`);
        }

        // Use LessonRequestMapper instead of static method
        const lessonRequest = LessonRequestMapper.toModel(dbLessonRequest);

        // Get available teachers
        const availableTeachers = await this.getAvailableTeachers(lessonType);

        if (availableTeachers.length === 0) {
            return [];
        }

        // Create Prisma quote records
        const creationPromises = availableTeachers.map(async (teacher) => {
            const hourlyRate = teacher.getHourlyRate(lessonRequest.type);
            if (!hourlyRate) {
                console.error(`No active hourly rate found for teacher ${teacher.id} for lesson type ${lessonRequest.type}. Skipping quote.`);
                return null; // Skip this teacher
            }
            const costInCents = hourlyRate.calculateCostForDuration(lessonRequest.durationMinutes);
            try {
                await this.prisma.lessonQuote.create({
                    data: {
                        lessonRequest: { connect: { id: lessonRequestId } },
                        teacher: { connect: { id: teacher.id } },
                        costInCents,
                        hourlyRateInCents: hourlyRate.rateInCents,
                    }
                });
                return teacher.id; // Indicate success
            } catch (error) {
                console.error(`Failed to create quote for teacher ${teacher.id}:`, error);
                return null; // Indicate failure
            }
        });

        await Promise.all(creationPromises);

        // Fetch all successfully created quotes for the request ID with includes needed for mapping
        const dbQuotes = await this.prisma.lessonQuote.findMany({
            where: { lessonRequestId: lessonRequestId },
            include: {
                teacher: { include: { teacherLessonHourlyRates: true } },
                lessonRequest: { include: { student: true, address: true } }
            }
        });

        // Use LessonQuoteMapper to transform the results
        return dbQuotes.map(dbQuote => LessonQuoteMapper.toModel(dbQuote));
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
        const dbQuotes = await this.prisma.lessonQuote.findMany({
            where: { lessonRequestId },
            include: {
                // Include relations needed for mapping
                teacher: { include: { teacherLessonHourlyRates: true } },
                lessonRequest: { include: { student: true, address: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Use LessonQuoteMapper to transform the results
        return dbQuotes.map(dbQuote =>
            LessonQuoteMapper.toModel(dbQuote)
        );
    }
}

// Export a singleton instance
export const lessonQuoteService = new LessonQuoteService(); 