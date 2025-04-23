import { PrismaClient, Prisma, Teacher as DbTeacherPrisma, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate, Lesson as DbLesson, Student as DbStudent, Address as DbAddress, LessonRequest as DbLessonRequestPrisma, LessonQuote as DbLessonQuote, LessonStatus as DbLessonStatus, Goal as DbGoal } from '@prisma/client';
// Import shared models
import { Teacher } from '../../shared/models/Teacher.js';
import { Student } from '../../shared/models/Student.js';
import { Address } from '../../shared/models/Address.js';
import { Lesson } from '../../shared/models/Lesson.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { LessonStatus, LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { Goal } from '../../shared/models/Goal.js'; // Goal might be needed for stats or future methods
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { LessonType } from '../../shared/models/LessonType.js';
import * as bcrypt from 'bcrypt';
import prisma from '../prisma.js';


// Define more specific Prisma types with includes for transformation
type DbLessonWithRelations = DbLesson & {
    currentStatus: DbLessonStatus | null;
    // Update quote type to reflect full nesting needed for LessonQuote.fromDb
    quote: (DbLessonQuote & {
        teacher: DbTeacherPrisma & { teacherLessonHourlyRates?: DbTeacherLessonHourlyRate[] },
        lessonRequest: (DbLessonRequestPrisma & {
            student: DbStudent;
            address: DbAddress;
        })
    });
};

// Keep DbTeacherWithRates for other raw methods if needed
interface DbTeacherWithRates extends DbTeacherPrisma {
    teacherLessonHourlyRates: DbTeacherLessonHourlyRate[];
}


class TeacherService {
    private readonly prisma = prisma;

    /**
     * Create a new teacher
     * @param teacherData Teacher data including password
     * @returns Created teacher (shared model)
     */
    async create(teacherData: Prisma.TeacherCreateInput & { password: string }): Promise<Teacher> {
        try {
            const hashedPassword = await bcrypt.hash(teacherData.password, 10);
            // Fetch the created teacher *without* rates initially
            const dbTeacher = await this.prisma.teacher.create({ data: { ...teacherData, password: hashedPassword, authMethods: ['PASSWORD'], isActive: true } });
            // Pass the teacher object, but no rates (pass undefined or omit)
            return Teacher.fromDb(dbTeacher); // Rates will be empty array by default
        } catch (error) {
            console.error('Error creating teacher:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new Error(`Teacher with email ${teacherData.email} already exists.`);
            }
            throw error;
        }
    }

    // --- Refactored Methods --- 

    /**
     * Find teachers filtered by lesson type and limit.
     * Returns shared Teacher model instances.
     */
    async findTeachersByLessonType(lessonType: LessonType, limit: number): Promise<Teacher[]> {
        const dbTeachers = await this.prisma.teacher.findMany({
            where: {
                teacherLessonHourlyRates: {
                    some: { type: lessonType, deactivatedAt: null }
                }
            },
            include: {
                teacherLessonHourlyRates: {
                    where: { type: lessonType, deactivatedAt: null }
                }
            },
            take: limit
        });
        // Use Teacher.fromDb - Cast rates as they are included
        return dbTeachers.map(dbTeacher =>
            Teacher.fromDb(dbTeacher, dbTeacher.teacherLessonHourlyRates as DbTeacherLessonHourlyRate[])
        );
    }

    /**
     * Find a teacher by ID including all rates.
     * Returns shared Teacher model instance or null.
     */
    async findTeacherWithRatesById(teacherId: string): Promise<Teacher | null> {
        const dbTeacher = await this.prisma.teacher.findUnique({
            where: { id: teacherId },
            include: {
                teacherLessonHourlyRates: true // Includes all rates, active and inactive
            }
        });
        if (!dbTeacher) {
            return null;
        }
        // Use Teacher.fromDb - Cast rates as they are included
        return Teacher.fromDb(dbTeacher, dbTeacher.teacherLessonHourlyRates as DbTeacherLessonHourlyRate[]);
    }

    /**
     * Create or update a lesson hourly rate for a teacher.
     * Returns the created/updated shared TeacherLessonHourlyRate model instance.
     */
    async upsertLessonRate(teacherId: string, rateData: { lessonType: LessonType; rateInCents: number; id?: string }): Promise<TeacherLessonHourlyRate> {
        const { id, lessonType, rateInCents } = rateData;

        const teacherExists = await this.prisma.teacher.count({ where: { id: teacherId } });
        if (teacherExists === 0) {
            throw new Error('Teacher not found');
        }

        let dbRate: DbTeacherLessonHourlyRate;

        if (id) {
            // Update existing rate
            const existingRate = await this.prisma.teacherLessonHourlyRate.findFirst({
                where: { id, teacherId }
            });
            if (!existingRate) {
                throw new Error('Lesson rate not found or does not belong to this teacher');
            }
            // When updating, ensure it's reactivated by setting deactivatedAt to null
            dbRate = await this.prisma.teacherLessonHourlyRate.update({
                where: { id },
                data: {
                    rateInCents: rateInCents,
                    deactivatedAt: null // Explicitly reactivate on update
                }
            });
        } else {
            // Create new rate
            // Check if an active or inactive rate already exists for this type
            const existingRate = await this.prisma.teacherLessonHourlyRate.findUnique({
                where: { teacherId_type: { teacherId, type: lessonType } }
            });
            if (existingRate) {
                // Instead of throwing, update the existing rate to reactivate and set the new price
                console.warn(`Rate for ${lessonType} already exists for teacher ${teacherId}. Updating existing rate.`);
                dbRate = await this.prisma.teacherLessonHourlyRate.update({
                    where: { id: existingRate.id },
                    data: {
                        rateInCents: rateInCents,
                        deactivatedAt: null // Ensure it's active
                    }
                });
            } else {
                // Create a new rate if none exists
                dbRate = await this.prisma.teacherLessonHourlyRate.create({
                    data: {
                        teacherId,
                        type: lessonType,
                        rateInCents
                        // deactivatedAt defaults to null
                    }
                });
            }
        }
        // Use TeacherLessonHourlyRate.fromDb
        return TeacherLessonHourlyRate.fromDb(dbRate);
    }

    /**
     * Deactivate a lesson hourly rate for a teacher.
     * Returns the deactivated shared TeacherLessonHourlyRate model instance.
     */
    async deactivateLessonRate(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate> {
        // Verify the rate exists and belongs to the teacher before updating
        const existingRate = await this.prisma.teacherLessonHourlyRate.findFirst({
            where: { id: rateId, teacherId }
        });
        if (!existingRate) {
            throw new Error('Lesson rate not found or does not belong to this teacher');
        }
        // Prevent deactivating if it's already deactivated? Or allow (idempotent)? Allowing is simpler.
        const dbRate = await this.prisma.teacherLessonHourlyRate.update({
            where: { id: rateId }, // Use the specific ID confirmed to belong to the teacher
            data: { deactivatedAt: new Date() }
        });
        // Use TeacherLessonHourlyRate.fromDb
        return TeacherLessonHourlyRate.fromDb(dbRate);
    }

    /**
     * Reactivate a previously deactivated lesson hourly rate.
     * Returns the reactivated shared TeacherLessonHourlyRate model instance.
     */
    async reactivateLessonRate(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate> {
        // Verify the rate exists and belongs to the teacher before updating
        const existingRate = await this.prisma.teacherLessonHourlyRate.findFirst({
            where: { id: rateId, teacherId }
        });
        if (!existingRate) {
            throw new Error('Lesson rate not found or does not belong to this teacher');
        }
        const dbRate = await this.prisma.teacherLessonHourlyRate.update({
            where: { id: rateId }, // Use the specific ID
            data: { deactivatedAt: null } // Set deactivatedAt to null to reactivate
        });
        // Use TeacherLessonHourlyRate.fromDb
        return TeacherLessonHourlyRate.fromDb(dbRate);
    }

    /**
     * Find all lessons for a teacher, optionally filtered by student.
     * Returns transformed shared Lesson models.
     */
    async findLessonsByTeacherId(teacherId: string, studentId?: string): Promise<Lesson[]> {
        const dbLessons = await this.prisma.lesson.findMany({
            where: {
                quote: {
                    teacherId: teacherId,
                    lessonRequest: studentId ? { studentId } : undefined
                }
            },
            include: {
                quote: {
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
                },
                currentStatus: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return dbLessons.map(dbLesson => Lesson.fromDb(dbLesson as DbLessonWithRelations)).filter(lesson => lesson !== null) as Lesson[];
    }

    /**
     * Get statistics for a teacher
     * @param teacherId The ID of the teacher
     * @returns Teacher statistics object (not a shared model, specific structure)
     */
    async getTeacherStatistics(teacherId: string): Promise<any> {
        const stats = await this.prisma.$transaction(async (tx) => {
            // Fetch lessons including quote for cost and lessonRequest for startTime
            const lessons = await tx.lesson.findMany({
                where: {
                    quote: { teacherId: teacherId }
                },
                include: {
                    currentStatus: true, // Needed for completedLessons count & totalEarnings
                    goals: {
                        include: {
                            currentStatus: true // Needed for completedGoals count
                        }
                    },
                    quote: { // Needed for totalEarnings
                        select: {
                            costInCents: true,
                            lessonRequest: { // Needed for upcomingLessons
                                select: {
                                    startTime: true
                                }
                            }
                        }
                    }
                }
            });

            const now = new Date();
            let upcomingLessons = 0;
            let totalEarnings = 0;
            let completedLessons = 0;

            lessons.forEach(lesson => {
                // Calculate completed lessons
                if (lesson.currentStatus?.status === LessonStatusValue.COMPLETED) {
                    completedLessons++;
                    // Calculate earnings only for completed lessons
                    totalEarnings += lesson.quote?.costInCents ?? 0;
                }
                // Calculate upcoming lessons (requires startTime from lessonRequest)
                if (lesson.quote?.lessonRequest?.startTime && lesson.quote.lessonRequest.startTime > now) {
                    upcomingLessons++;
                }
            });

            const totalLessons = lessons.length;
            const totalGoals = lessons.reduce((sum, lesson) => sum + lesson.goals.length, 0);
            const completedGoals = lessons.reduce((sum, lesson) =>
                sum + lesson.goals.filter(g => g.currentStatus?.status === 'COMPLETED').length, 0
            );

            // Return all calculated stats
            return {
                totalLessons,
                completedLessons,
                totalGoals,
                completedGoals,
                upcomingLessons, // Added
                totalEarnings,   // Added (in cents)
                completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
                goalsPerLesson: totalLessons > 0 ? totalGoals / totalLessons : 0,
                goalCompletionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0
            };
        });

        return stats;
    }

}

// Export singleton instance
export const teacherService = new TeacherService(); 