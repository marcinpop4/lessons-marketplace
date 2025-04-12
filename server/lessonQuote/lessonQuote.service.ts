import prisma from '../prisma.js';
import type { PrismaClient } from '@prisma/client';
import { LessonType } from '../../shared/models/LessonType.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { Student } from '../../shared/models/Student.js';
import { Address } from '../../shared/models/Address.js';

export class TeacherQuoteService {
    /**
     * Get available teachers for a lesson type
     * @param lessonType - Type of lesson
     * @returns Array of available teachers
     */
    async getAvailableTeachers(lessonType: LessonType): Promise<Teacher[]> {
        const dbTeachers = await prisma.teacher.findMany({
            where: {
                teacherLessonHourlyRates: {
                    some: {
                        type: lessonType,
                        deactivatedAt: null
                    }
                }
            },
            include: {
                teacherLessonHourlyRates: {
                    where: {
                        type: lessonType,
                        deactivatedAt: null
                    }
                }
            },
            take: 5
        });

        // Map database teachers to domain model
        return dbTeachers.map(dbTeacher => {
            const teacher = new Teacher(
                dbTeacher.id,
                dbTeacher.firstName,
                dbTeacher.lastName,
                dbTeacher.email,
                dbTeacher.phoneNumber,
                dbTeacher.dateOfBirth
            );

            // Add hourly rates to teacher
            dbTeacher.teacherLessonHourlyRates.forEach(rate => {
                teacher.addHourlyRate(
                    new TeacherLessonHourlyRate(
                        rate.id,
                        rate.teacherId,
                        rate.type,
                        rate.rateInCents,
                        rate.createdAt,
                        rate.updatedAt,
                        rate.deactivatedAt || undefined
                    )
                );
            });

            return teacher;
        });
    }

    /**
     * Create quotes for a lesson request from available teachers
     * @param lessonRequestId - ID of the lesson request
     * @param lessonType - Type of lesson
     * @returns Array of created quotes
     */
    async createQuotesForLessonRequest(
        lessonRequestId: string,
        lessonType: LessonType
    ): Promise<LessonQuote[]> {
        // Get the lesson request with all necessary data
        const dbLessonRequest = await prisma.lessonRequest.findUnique({
            where: { id: lessonRequestId },
            include: {
                student: true,
                address: true
            }
        });

        if (!dbLessonRequest) {
            throw new Error(`Lesson request with ID ${lessonRequestId} not found`);
        }

        // Convert to domain model
        const student = new Student(
            dbLessonRequest.student.id,
            dbLessonRequest.student.firstName,
            dbLessonRequest.student.lastName,
            dbLessonRequest.student.email,
            dbLessonRequest.student.phoneNumber,
            dbLessonRequest.student.dateOfBirth
        );

        const lessonRequest = new LessonRequest(
            dbLessonRequest.id,
            dbLessonRequest.type as LessonType,
            new Date(dbLessonRequest.startTime),
            dbLessonRequest.durationMinutes,
            new Address(
                dbLessonRequest.address.street,
                dbLessonRequest.address.city,
                dbLessonRequest.address.state,
                dbLessonRequest.address.postalCode,
                dbLessonRequest.address.country
            ),
            student
        );

        // Get available teachers (limited to 5)
        const availableTeachers = await this.getAvailableTeachers(lessonType);

        if (availableTeachers.length === 0) {
            return [];
        }

        // Create quotes for each available teacher
        const dbQuotes = await Promise.all(
            availableTeachers.map(async (teacher) => {
                const hourlyRate = teacher.getHourlyRate(lessonType);
                if (!hourlyRate) {
                    throw new Error(`No hourly rate found for teacher ${teacher.id} for lesson type ${lessonType}`);
                }

                // Calculate quote expiration (24 hours from now)
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);

                // Calculate cost based on lesson duration and hourly rate
                const costInCents = hourlyRate.calculateCostForDuration(lessonRequest.durationMinutes);

                const quote = await prisma.lessonQuote.create({
                    data: {
                        lessonRequest: { connect: { id: lessonRequestId } },
                        teacher: { connect: { id: teacher.id } },
                        costInCents,
                        expiresAt,
                        hourlyRateInCents: hourlyRate.rateInCents,
                    },
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

                return quote;
            })
        );

        // Convert database quotes to domain model
        return dbQuotes.map(dbQuote => {
            const student = new Student(
                dbQuote.lessonRequest.student.id,
                dbQuote.lessonRequest.student.firstName,
                dbQuote.lessonRequest.student.lastName,
                dbQuote.lessonRequest.student.email,
                dbQuote.lessonRequest.student.phoneNumber,
                dbQuote.lessonRequest.student.dateOfBirth
            );

            const lessonRequest = new LessonRequest(
                dbQuote.lessonRequest.id,
                dbQuote.lessonRequest.type as LessonType,
                new Date(dbQuote.lessonRequest.startTime),
                dbQuote.lessonRequest.durationMinutes,
                new Address(
                    dbQuote.lessonRequest.address.street,
                    dbQuote.lessonRequest.address.city,
                    dbQuote.lessonRequest.address.state,
                    dbQuote.lessonRequest.address.postalCode,
                    dbQuote.lessonRequest.address.country
                ),
                student
            );

            const teacher = new Teacher(
                dbQuote.teacher.id,
                dbQuote.teacher.firstName,
                dbQuote.teacher.lastName,
                dbQuote.teacher.email,
                dbQuote.teacher.phoneNumber,
                dbQuote.teacher.dateOfBirth
            );

            // Create a temporary hourly rate to calculate the hourly rate in cents
            const hourlyRate = new TeacherLessonHourlyRate(
                '', // We don't need the ID for this calculation
                teacher.id,
                lessonRequest.type,
                dbQuote.costInCents
            );

            return new LessonQuote(
                dbQuote.id,
                lessonRequest,
                teacher,
                dbQuote.costInCents,
                new Date(dbQuote.createdAt),
                new Date(dbQuote.expiresAt),
                hourlyRate.calculateCostForDuration(60) // Calculate cost for 60 minutes to get hourly rate
            );
        });
    }

    /**
     * Get all quotes for a lesson request
     * @param lessonRequestId - ID of the lesson request
     * @returns Array of quotes with teacher information
     */
    async getQuotesByLessonRequest(lessonRequestId: string): Promise<LessonQuote[]> {
        const dbQuotes = await prisma.lessonQuote.findMany({
            where: { lessonRequestId },
            include: {
                teacher: true,
                lessonRequest: {
                    include: {
                        student: true,
                        address: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Convert database quotes to domain model
        return dbQuotes.map(dbQuote => {
            const student = new Student(
                dbQuote.lessonRequest.student.id,
                dbQuote.lessonRequest.student.firstName,
                dbQuote.lessonRequest.student.lastName,
                dbQuote.lessonRequest.student.email,
                dbQuote.lessonRequest.student.phoneNumber,
                dbQuote.lessonRequest.student.dateOfBirth
            );

            const lessonRequest = new LessonRequest(
                dbQuote.lessonRequest.id,
                dbQuote.lessonRequest.type as LessonType,
                new Date(dbQuote.lessonRequest.startTime),
                dbQuote.lessonRequest.durationMinutes,
                new Address(
                    dbQuote.lessonRequest.address.street,
                    dbQuote.lessonRequest.address.city,
                    dbQuote.lessonRequest.address.state,
                    dbQuote.lessonRequest.address.postalCode,
                    dbQuote.lessonRequest.address.country
                ),
                student
            );

            const teacher = new Teacher(
                dbQuote.teacher.id,
                dbQuote.teacher.firstName,
                dbQuote.teacher.lastName,
                dbQuote.teacher.email,
                dbQuote.teacher.phoneNumber,
                dbQuote.teacher.dateOfBirth
            );

            // Create a temporary hourly rate to calculate the hourly rate in cents
            const hourlyRate = new TeacherLessonHourlyRate(
                '', // We don't need the ID for this calculation
                teacher.id,
                lessonRequest.type,
                dbQuote.costInCents
            );

            return new LessonQuote(
                dbQuote.id,
                lessonRequest,
                teacher,
                dbQuote.costInCents,
                new Date(dbQuote.createdAt),
                new Date(dbQuote.expiresAt),
                hourlyRate.calculateCostForDuration(60) // Calculate cost for 60 minutes to get hourly rate
            );
        });
    }
}

// Export a singleton instance
export const teacherQuoteService = new TeacherQuoteService(); 