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
            const teacher = new Teacher({
                id: dbTeacher.id,
                firstName: dbTeacher.firstName,
                lastName: dbTeacher.lastName,
                email: dbTeacher.email,
                phoneNumber: dbTeacher.phoneNumber,
                dateOfBirth: dbTeacher.dateOfBirth
            });

            // Add hourly rates to teacher
            dbTeacher.teacherLessonHourlyRates.forEach(rate => {
                teacher.addHourlyRate(
                    new TeacherLessonHourlyRate({
                        id: rate.id,
                        teacherId: rate.teacherId,
                        type: rate.type,
                        rateInCents: rate.rateInCents,
                        deactivatedAt: rate.deactivatedAt ? new Date(rate.deactivatedAt) : undefined,
                        createdAt: new Date(rate.createdAt)
                    })
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

        // Transform student data
        const student = new Student({
            id: dbLessonRequest.student.id,
            firstName: dbLessonRequest.student.firstName,
            lastName: dbLessonRequest.student.lastName,
            email: dbLessonRequest.student.email,
            phoneNumber: dbLessonRequest.student.phoneNumber,
            dateOfBirth: new Date(dbLessonRequest.student.dateOfBirth)
        });

        // Transform address data
        const address = new Address({
            street: dbLessonRequest.address.street,
            city: dbLessonRequest.address.city,
            state: dbLessonRequest.address.state,
            postalCode: dbLessonRequest.address.postalCode,
            country: dbLessonRequest.address.country
        });

        // Create LessonRequest model
        const lessonRequest = new LessonRequest({
            id: dbLessonRequest.id,
            type: dbLessonRequest.type as LessonType,
            startTime: new Date(dbLessonRequest.startTime),
            durationMinutes: dbLessonRequest.durationMinutes,
            address: address,
            student: student
        });

        // Get available teachers (limited to 5)
        const availableTeachers = await this.getAvailableTeachers(lessonType);

        if (availableTeachers.length === 0) {
            return [];
        }

        // Create quotes for each available teacher
        const dbQuotes = await Promise.all(
            availableTeachers.map(async (dbTeacher) => {
                const teacherModel = new Teacher({
                    id: dbTeacher.id,
                    firstName: dbTeacher.firstName,
                    lastName: dbTeacher.lastName,
                    email: dbTeacher.email,
                    phoneNumber: dbTeacher.phoneNumber,
                    dateOfBirth: new Date(dbTeacher.dateOfBirth),
                    hourlyRates: dbTeacher.hourlyRates.map(rate => new TeacherLessonHourlyRate({
                        id: rate.id,
                        teacherId: rate.teacherId,
                        type: rate.type,
                        rateInCents: rate.rateInCents,
                        deactivatedAt: rate.deactivatedAt ? new Date(rate.deactivatedAt) : undefined,
                        createdAt: new Date(rate.createdAt)
                    }))
                });

                const hourlyRate = teacherModel.getHourlyRate(lessonRequest.type);
                if (!hourlyRate) {
                    console.error(`No hourly rate found for teacher ${teacherModel.id} for lesson type ${lessonRequest.type}`);
                    return null;
                }

                // Calculate quote expiration (24 hours from now)
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);

                // Calculate cost based on lesson duration and hourly rate
                const costInCents = hourlyRate.calculateCostForDuration(lessonRequest.durationMinutes);

                const quote = await prisma.lessonQuote.create({
                    data: {
                        lessonRequest: { connect: { id: lessonRequestId } },
                        teacher: { connect: { id: teacherModel.id } },
                        costInCents,
                        expiresAt,
                        hourlyRateInCents: hourlyRate.rateInCents,
                    },
                    include: {
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
                });

                return quote;
            })
        );

        // Filter out any null results (teachers without rates)
        const createdQuotes = (await dbQuotes).filter(quote => quote !== null);

        if (!createdQuotes || createdQuotes.length === 0) {
            return [];
        }

        // Convert database quotes to domain model
        return createdQuotes.map(dbQuote => {
            // Transform student data
            const studentModel = new Student({
                id: dbQuote.lessonRequest.student.id,
                firstName: dbQuote.lessonRequest.student.firstName,
                lastName: dbQuote.lessonRequest.student.lastName,
                email: dbQuote.lessonRequest.student.email,
                phoneNumber: dbQuote.lessonRequest.student.phoneNumber,
                dateOfBirth: dbQuote.lessonRequest.student.dateOfBirth
            });

            // Transform address data
            const addressModel = new Address({
                street: dbQuote.lessonRequest.address.street,
                city: dbQuote.lessonRequest.address.city,
                state: dbQuote.lessonRequest.address.state,
                postalCode: dbQuote.lessonRequest.address.postalCode,
                country: dbQuote.lessonRequest.address.country
            });

            // Create LessonRequest model
            const lessonRequestModel = new LessonRequest({
                id: dbQuote.lessonRequest.id,
                type: dbQuote.lessonRequest.type as LessonType,
                startTime: new Date(dbQuote.lessonRequest.startTime),
                durationMinutes: dbQuote.lessonRequest.durationMinutes,
                address: addressModel,
                student: studentModel
            });

            // Transform teacher data
            const teacherModel = new Teacher({
                id: dbQuote.teacher.id,
                firstName: dbQuote.teacher.firstName,
                lastName: dbQuote.teacher.lastName,
                email: dbQuote.teacher.email,
                phoneNumber: dbQuote.teacher.phoneNumber,
                dateOfBirth: new Date(dbQuote.teacher.dateOfBirth),
                hourlyRates: dbQuote.teacher.teacherLessonHourlyRates.map(rate => new TeacherLessonHourlyRate({
                    id: rate.id,
                    teacherId: rate.teacherId,
                    type: rate.type,
                    rateInCents: rate.rateInCents,
                    deactivatedAt: rate.deactivatedAt ? new Date(rate.deactivatedAt) : undefined,
                    createdAt: new Date(rate.createdAt)
                }))
            });

            return new LessonQuote({
                id: dbQuote.id,
                lessonRequest: lessonRequestModel,
                teacher: teacherModel,
                costInCents: dbQuote.costInCents,
                hourlyRateInCents: dbQuote.hourlyRateInCents!,
                createdAt: new Date(dbQuote.createdAt),
                expiresAt: new Date(dbQuote.expiresAt)
            });
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
            },
            orderBy: { createdAt: 'desc' }
        });

        // Convert database quotes to domain model
        return dbQuotes.map(dbQuote => {
            // Transform student data
            const studentModel = new Student({
                id: dbQuote.lessonRequest.student.id,
                firstName: dbQuote.lessonRequest.student.firstName,
                lastName: dbQuote.lessonRequest.student.lastName,
                email: dbQuote.lessonRequest.student.email,
                phoneNumber: dbQuote.lessonRequest.student.phoneNumber,
                dateOfBirth: new Date(dbQuote.lessonRequest.student.dateOfBirth)
            });

            // Transform address data
            const addressModel = new Address({
                street: dbQuote.lessonRequest.address.street,
                city: dbQuote.lessonRequest.address.city,
                state: dbQuote.lessonRequest.address.state,
                postalCode: dbQuote.lessonRequest.address.postalCode,
                country: dbQuote.lessonRequest.address.country
            });

            // Create LessonRequest model
            const lessonRequestModel = new LessonRequest({
                id: dbQuote.lessonRequest.id,
                type: dbQuote.lessonRequest.type as LessonType,
                startTime: new Date(dbQuote.lessonRequest.startTime),
                durationMinutes: dbQuote.lessonRequest.durationMinutes,
                address: addressModel,
                student: studentModel
            });

            // Transform teacher data
            const teacherModel = new Teacher({
                id: dbQuote.teacher.id,
                firstName: dbQuote.teacher.firstName,
                lastName: dbQuote.teacher.lastName,
                email: dbQuote.teacher.email,
                phoneNumber: dbQuote.teacher.phoneNumber,
                dateOfBirth: new Date(dbQuote.teacher.dateOfBirth),
                hourlyRates: dbQuote.teacher.teacherLessonHourlyRates.map(rate => new TeacherLessonHourlyRate({
                    id: rate.id,
                    teacherId: rate.teacherId,
                    type: rate.type,
                    rateInCents: rate.rateInCents,
                    deactivatedAt: rate.deactivatedAt ? new Date(rate.deactivatedAt) : undefined,
                    createdAt: new Date(rate.createdAt)
                }))
            });

            return new LessonQuote({
                id: dbQuote.id,
                lessonRequest: lessonRequestModel,
                teacher: teacherModel,
                costInCents: dbQuote.costInCents,
                hourlyRateInCents: dbQuote.hourlyRateInCents!,
                createdAt: new Date(dbQuote.createdAt),
                expiresAt: new Date(dbQuote.expiresAt)
            });
        });
    }
}

// Export a singleton instance
export const teacherQuoteService = new TeacherQuoteService(); 