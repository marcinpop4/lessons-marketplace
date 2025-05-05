import { TeacherLessonHourlyRate as PrismaTeacherLessonHourlyRate, LessonType, Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { TeacherLessonHourlyRateMapper } from './teacher-lesson-hourly-rate.mapper.js';
// Import Status model and enums
import { TeacherLessonHourlyRateStatus, TeacherLessonHourlyRateStatusValue, TeacherLessonHourlyRateStatusTransition } from '../../shared/models/TeacherLessonHourlyRateStatus.js';
import { NotFoundError, BadRequestError, ConflictError } from '../errors/index.js';

// Define simple error messages for service layer exceptions
const Errors = {
    MISSING_DATA: 'Missing or invalid data for creating/updating hourly rate.',
    TEACHER_NOT_FOUND: 'Teacher not found.',
    RATE_NOT_FOUND_OR_ACCESS_DENIED: 'Lesson rate not found or access denied.',
    RATE_EXISTS_INACTIVE: (type: LessonType) => `A rate for type ${type} already exists but is inactive. Use PATCH to reactivate.`,
    RATE_CONFLICT_ACTIVE: (type: LessonType) => `An active rate for type ${type} already exists.`,
    DATABASE_ERROR: 'Database error occurred.', // Generic DB error
    TRANSACTION_ERROR: 'Database transaction failed.'
};

class TeacherLessonHourlyRateService {
    private readonly prisma = prisma;

    /**
     * Creates a new lesson rate.
     * Ensures an initial ACTIVE status record is created.
     * Throws ConflictError if a rate for the given type already exists for the teacher.
     * @returns The newly created TeacherLessonHourlyRate.
     * @throws NotFoundError, BadRequestError, ConflictError
     */
    async createLessonRate(teacherId: string, type: LessonType, rateInCents: number): Promise<TeacherLessonHourlyRate> {
        if (!teacherId || !type || rateInCents == null || rateInCents <= 0) {
            throw new BadRequestError(Errors.MISSING_DATA);
        }

        // Validate teacher exists
        const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) {
            throw new NotFoundError(Errors.TEACHER_NOT_FOUND);
        }

        const newRate = await this.prisma.$transaction(async (tx) => {
            // Check if ANY rate for this teacher and type already exists
            const existingRate = await tx.teacherLessonHourlyRate.findFirst({
                where: {
                    teacherId: teacherId,
                    type: type
                },
                include: { currentStatus: true } // Need status to check if active
            });

            if (existingRate) {
                // A rate exists, check its status
                if (existingRate.currentStatus?.status === TeacherLessonHourlyRateStatusValue.ACTIVE) {
                    throw new ConflictError(Errors.RATE_CONFLICT_ACTIVE(type));
                } else {
                    // Rate exists but is inactive
                    throw new ConflictError(Errors.RATE_EXISTS_INACTIVE(type));
                }
            }

            // No existing rate found for this type, proceed with creation
            // 1. Create the new rate record
            const createdRateRecord = await tx.teacherLessonHourlyRate.create({
                data: {
                    teacherId: teacherId,
                    type: type,
                    rateInCents: rateInCents
                }
            });
            // 2. Create the initial ACTIVE status for the new rate
            const newActiveStatus = await tx.teacherLessonHourlyRateStatus.create({
                data: {
                    rateId: createdRateRecord.id,
                    status: TeacherLessonHourlyRateStatusValue.ACTIVE
                }
            });
            // 3. Link the new rate to its ACTIVE status
            const finalRateWithStatus = await tx.teacherLessonHourlyRate.update({
                where: { id: createdRateRecord.id },
                data: { currentStatusId: newActiveStatus.id },
                include: { currentStatus: true } // Include status for return
            });

            return finalRateWithStatus;
        });

        // Return the mapped rate
        return TeacherLessonHourlyRateMapper.toModel(newRate, newRate.currentStatus);
    }

    /**
     * Updates the status of a specific lesson rate using transitions.
     * @param teacherId The ID of the teacher performing the action.
     * @param rateId The ID of the rate to update.
     * @param transition The status transition to apply (ACTIVATE/DEACTIVATE).
     * @param context Optional context for the status change.
     * @returns The updated TeacherLessonHourlyRate.
     * @throws NotFoundError, BadRequestError, ConflictError
     */
    async updateLessonRateStatus(
        teacherId: string,
        rateId: string,
        transition: TeacherLessonHourlyRateStatusTransition,
        context?: any
    ): Promise<TeacherLessonHourlyRate> {

        const updatedRate = await this.prisma.$transaction(async (tx) => {
            // 1. Fetch the rate and its current status, ensuring it belongs to the teacher
            const rate = await tx.teacherLessonHourlyRate.findUnique({
                where: { id: rateId },
                include: { currentStatus: true }
            });

            if (!rate || rate.teacherId !== teacherId) {
                throw new NotFoundError(Errors.RATE_NOT_FOUND_OR_ACCESS_DENIED);
            }

            if (!rate.currentStatus) {
                // Should not happen if creation logic is correct, but handle defensively
                throw new ConflictError('Cannot transition status: Rate has no current status record.');
            }

            const currentStatusValue = rate.currentStatus.status as TeacherLessonHourlyRateStatusValue;

            // 2. Validate the transition
            if (!TeacherLessonHourlyRateStatus.isValidTransition(currentStatusValue, transition)) {
                throw new ConflictError(`Invalid transition: Cannot ${transition} a rate that is already ${currentStatusValue}.`);
            }

            // Special check for ACTIVATE: Ensure no *other* rate of the same type is already active
            if (transition === TeacherLessonHourlyRateStatusTransition.ACTIVATE) {
                const otherActiveRate = await tx.teacherLessonHourlyRate.findFirst({
                    where: {
                        teacherId: teacherId,
                        type: rate.type,
                        id: { not: rateId }, // Exclude the current rate
                        currentStatus: {
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    }
                });
                if (otherActiveRate) {
                    // Use the specific conflict error message here too
                    throw new ConflictError(Errors.RATE_CONFLICT_ACTIVE(rate.type));
                }
            }

            // 3. Determine the new status value
            const newStatusValue = TeacherLessonHourlyRateStatus.getResultingStatus(currentStatusValue, transition);

            // 4. Create the new status record
            const newStatus = await tx.teacherLessonHourlyRateStatus.create({
                data: {
                    rateId: rateId,
                    status: newStatusValue,
                    context: context || null // Store context if provided
                }
            });

            // 5. Update the rate to point to the new status record
            const finalUpdatedRate = await tx.teacherLessonHourlyRate.update({
                where: { id: rateId },
                data: { currentStatusId: newStatus.id },
                include: { currentStatus: true } // Include the latest status
            });

            return finalUpdatedRate;
        });

        // Map and return the result
        return TeacherLessonHourlyRateMapper.toModel(updatedRate, updatedRate.currentStatus);
    }

    /**
     * Find a specific rate by its ID, ensuring it belongs to the specified teacher.
     * Includes the current status.
     */
    async findRateById(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate | null> {
        const dbRate = await this.prisma.teacherLessonHourlyRate.findUnique({
            where: {
                id: rateId,
                teacherId: teacherId // Ensure the rate belongs to the requesting teacher
            },
            include: {
                currentStatus: true
            }
        });

        if (!dbRate) {
            return null;
        }

        return TeacherLessonHourlyRateMapper.toModel(dbRate, dbRate.currentStatus);
    }

}

export const teacherLessonHourlyRateService = new TeacherLessonHourlyRateService();