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
    RATE_ALREADY_DEACTIVATED: 'Lesson rate is already deactivated.',
    RATE_ALREADY_ACTIVE: 'Lesson rate is already active.',
    RATE_CONFLICT_ACTIVE: (type: LessonType) => `Another rate for type ${type} is already active. Deactivate it first.`,
    DATABASE_ERROR: 'Database error occurred.', // Generic DB error
    TRANSACTION_ERROR: 'Database transaction failed.'
};

// Define return type for createOrUpdateLessonRate
interface CreateOrUpdateResult {
    rate: TeacherLessonHourlyRate;
    wasCreated: boolean;
}

class TeacherLessonHourlyRateService {
    private readonly prisma = prisma;

    /**
     * Creates a new lesson rate or updates the price of an existing active one.
     * If price changes, the old active rate is marked INACTIVE and a new ACTIVE rate is created.
     * Always ensures an initial ACTIVE status record is created for new rates.
     * @returns Object containing the final rate and a boolean indicating if a new rate record was created.
     * @throws NotFoundError, BadRequestError, ConflictError
     */
    async createOrUpdateLessonRate(teacherId: string, type: LessonType, rateInCents: number): Promise<CreateOrUpdateResult> {
        if (!teacherId || !type || rateInCents == null || rateInCents <= 0) {
            throw new BadRequestError('Missing or invalid data for creating/updating hourly rate.');
        }

        // Validate teacher exists (as per architecture rule, service validates dependencies)
        const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) {
            throw new NotFoundError('Teacher not found.');
        }

        let wasCreated = false;

        const resultRate = await this.prisma.$transaction(async (tx) => {
            // Find the current *active* rate for this teacher and type
            const currentActiveRate = await tx.teacherLessonHourlyRate.findFirst({
                where: {
                    teacherId: teacherId,
                    type: type,
                    currentStatus: {
                        status: TeacherLessonHourlyRateStatusValue.ACTIVE
                    }
                },
                include: { currentStatus: true } // Include status for comparison
            });

            let finalRate: PrismaTeacherLessonHourlyRate & { currentStatus: any }; // Add currentStatus to type

            if (currentActiveRate) {
                // Active rate exists
                if (currentActiveRate.rateInCents !== rateInCents) {
                    // Price changed: Deactivate old, create new

                    // 1. Create new INACTIVE status for the old rate
                    const oldInactiveStatus = await tx.teacherLessonHourlyRateStatus.create({
                        data: {
                            rateId: currentActiveRate.id,
                            status: TeacherLessonHourlyRateStatusValue.INACTIVE,
                            // context: { reason: 'Price updated' } // Optional context
                        }
                    });
                    // 2. Update the old rate to point to the new INACTIVE status
                    await tx.teacherLessonHourlyRate.update({
                        where: { id: currentActiveRate.id },
                        data: { currentStatusId: oldInactiveStatus.id }
                    });

                    // 3. Create the new rate record
                    const newRate = await tx.teacherLessonHourlyRate.create({
                        data: {
                            teacherId: teacherId,
                            type: type,
                            rateInCents: rateInCents
                        }
                    });
                    // 4. Create the initial ACTIVE status for the new rate
                    const newActiveStatus = await tx.teacherLessonHourlyRateStatus.create({
                        data: {
                            rateId: newRate.id,
                            status: TeacherLessonHourlyRateStatusValue.ACTIVE
                        }
                    });
                    // 5. Link the new rate to its ACTIVE status
                    finalRate = await tx.teacherLessonHourlyRate.update({
                        where: { id: newRate.id },
                        data: { currentStatusId: newActiveStatus.id },
                        include: { currentStatus: true } // Include status for return
                    });
                    wasCreated = true;
                } else {
                    // Price is the same: No change needed, return existing active rate
                    finalRate = currentActiveRate;
                    wasCreated = false;
                }
            } else {
                // No active rate exists for this type. Create a new one.
                // 1. Create the new rate record
                const newRate = await tx.teacherLessonHourlyRate.create({
                    data: {
                        teacherId: teacherId,
                        type: type,
                        rateInCents: rateInCents
                    }
                });
                // 2. Create the initial ACTIVE status for the new rate
                const newActiveStatus = await tx.teacherLessonHourlyRateStatus.create({
                    data: {
                        rateId: newRate.id,
                        status: TeacherLessonHourlyRateStatusValue.ACTIVE
                    }
                });
                // 3. Link the new rate to its ACTIVE status
                finalRate = await tx.teacherLessonHourlyRate.update({
                    where: { id: newRate.id },
                    data: { currentStatusId: newActiveStatus.id },
                    include: { currentStatus: true } // Include status for return
                });
                wasCreated = true;
            }
            return finalRate;
        });

        // Return both the mapped rate and the creation status
        return {
            rate: TeacherLessonHourlyRateMapper.toModel(resultRate, resultRate.currentStatus),
            wasCreated: wasCreated
        };
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
                throw new NotFoundError('Lesson rate not found or access denied.');
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
                    throw new ConflictError(`Cannot activate rate: Another rate for type ${rate.type} is already active (ID: ${otherActiveRate.id}). Deactivate it first.`);
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

    // Remove old deactivate and reactivate methods
    /*
    async deactivate(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate> {
        // ... old implementation ...
    }

    async reactivate(teacherId: string, rateId: string): Promise<TeacherLessonHourlyRate> {
        // ... old implementation ...
    }
    */

}

export const teacherLessonHourlyRateService = new TeacherLessonHourlyRateService();