import {
    PrismaClient, UserType,
    LessonPlan as PrismaLessonPlan,
    Lesson as PrismaLesson,
    Teacher as PrismaTeacher,
    Prisma
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { LessonPlan } from '@shared/models/LessonPlan.js';
import { LessonPlanStatus, LessonPlanStatusValue, LessonPlanStatusTransition } from '@shared/models/LessonPlanStatus.js';
import { CreateLessonPlanDto, UpdateLessonPlanStatusDto } from './lessonPlan.dto.js';
import { toSharedLessonPlan, PrismaLessonPlanWithRelations } from './lessonPlan.mapper.js';
import {
    NotFoundError,
    BadRequestError,
    AppError
} from '../errors/index.js';
import { AuthorizationError } from '../errors/authorization.error.js';
import prismaClientInstance from '../prisma.js';
import { isUuid } from '../utils/validation.utils.js'; // Import isUuid

// Define the includes needed for mapping
const lessonPlanIncludes = {
    currentStatus: true,
    statuses: true,
    milestones: true,
    lesson: { include: { quote: { include: { teacher: true, lessonRequest: { include: { student: true } } } } } },
    teacher: true // Include the newly added teacher relation
};

export class LessonPlanService {
    constructor(private readonly prisma: PrismaClient = prismaClientInstance) { }

    async createLessonPlan(
        createDto: CreateLessonPlanDto,
        teacherId: string,
        actorRole: UserType
    ): Promise<LessonPlan> {
        const { lessonId, title, description, dueDate } = createDto;

        // Basic validation
        if (!title || !description) {
            throw new BadRequestError('Title and description are required for a lesson plan.');
        }
        if (actorRole !== UserType.TEACHER) {
            throw new AuthorizationError('Only teachers can create lesson plans.');
        }

        let lessonTeacherId: string | undefined = undefined;

        // Validate lessonId and associated teacher if lessonId is provided
        if (lessonId) {
            if (!isUuid(lessonId)) {
                throw new BadRequestError('Provided Lesson ID must be a valid UUID.');
            }
            const lesson = await this.prisma.lesson.findUnique({
                where: { id: lessonId },
                select: { quote: { select: { teacherId: true } } }, // Select only teacherId for check
            });

            if (!lesson) {
                throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
            }
            // Store teacher ID from the lesson
            lessonTeacherId = lesson.quote.teacherId;

            // Authorization check: Ensure the actor is the teacher of the associated lesson
            if (lessonTeacherId !== teacherId) {
                throw new AuthorizationError('You are not authorized to create a lesson plan for this lesson.');
            }

            // Check if a plan already exists for this specific lesson
            const existingPlanForLesson = await this.prisma.lessonPlan.findUnique({
                where: { lessonId: lessonId }
            });
            if (existingPlanForLesson) {
                throw new BadRequestError('A lesson plan already exists for this lesson.');
            }
        }
        // If lessonId was not provided, lessonTeacherId remains undefined, which is fine.
        // The main authorization is that the actor MUST be a TEACHER.

        const lessonPlanId = uuidv4();
        const initialStatusId = uuidv4();

        // Transaction to ensure atomicity
        await this.prisma.$transaction(async (tx) => {
            // Step 1: Create LessonPlan (without currentStatus initially)
            const lessonPlanData: Prisma.LessonPlanCreateInput = {
                id: lessonPlanId,
                title,
                description,
                dueDate,
                teacher: { connect: { id: teacherId } }, // Reverted to connect for teacher based on previous linter success
                // currentStatusId is not set here initially
            };

            if (lessonId) {
                lessonPlanData.lesson = { connect: { id: lessonId } };
            }

            await tx.lessonPlan.create({
                data: lessonPlanData
            });

            // Step 2: Create the initial LessonPlanStatus, linking it to the LessonPlan
            await tx.lessonPlanStatus.create({
                data: {
                    id: initialStatusId,
                    lessonPlanId: lessonPlanId, // Link to the LessonPlan created in Step 1
                    status: LessonPlanStatusValue.DRAFT,
                }
            });

            // Step 3: Update the LessonPlan to set its currentStatusId
            await tx.lessonPlan.update({
                where: { id: lessonPlanId },
                data: {
                    currentStatusId: initialStatusId
                }
            });
        });

        // After transaction, fetch the complete LessonPlan to ensure all relations are present
        const completePrismaLessonPlan = await this.prisma.lessonPlan.findUnique({
            where: { id: lessonPlanId },
            include: lessonPlanIncludes, // Use the standard includes
        });

        if (!completePrismaLessonPlan) {
            // This should ideally not happen if the transaction was successful and ID is correct
            throw new AppError('Failed to retrieve lesson plan after creation.', 500);
        }

        // Type assertion as per user's latest file version
        return toSharedLessonPlan(completePrismaLessonPlan as PrismaLessonPlanWithRelations);
    }

    async getLessonPlanById(lessonPlanId: string, actorUserId: string): Promise<LessonPlan | null> {
        if (!isUuid(lessonPlanId)) {
            throw new BadRequestError('Invalid Lesson Plan ID format.');
        }

        const lessonPlan = await this.prisma.lessonPlan.findUnique({
            where: { id: lessonPlanId },
            include: lessonPlanIncludes // Use defined includes
        });

        if (!lessonPlan) {
            throw new NotFoundError(`Lesson plan with ID ${lessonPlanId} not found.`);
        }

        // Authorization:
        // 1. The teacher who created the plan can view it.
        // Corrected: Access teacher.id since 'teacher' object is included
        if (lessonPlan.teacher && lessonPlan.teacher.id === actorUserId) {
            return toSharedLessonPlan(lessonPlan as PrismaLessonPlanWithRelations);
        }

        // 2. If associated with a lesson, the student of that lesson can view it.
        // Using optional chaining for safer access
        if (lessonPlan.lesson?.quote?.lessonRequest?.studentId === actorUserId) {
            return toSharedLessonPlan(lessonPlan as PrismaLessonPlanWithRelations);
        }

        // If neither condition is met, user is not authorized.
        throw new AuthorizationError('You are not authorized to view this lesson plan.');
    }

    async getLessonPlansForUser(actorUserId: string, actorRole: UserType): Promise<LessonPlan[]> {
        let whereClause = {};

        if (actorRole === UserType.TEACHER) {
            // Teacher sees plans they created
            whereClause = { teacherId: actorUserId };
        } else if (actorRole === UserType.STUDENT) {
            // Student sees plans linked to their lessons
            whereClause = {
                lesson: {
                    quote: { lessonRequest: { studentId: actorUserId } },
                },
            };
        } else {
            // Should not happen if controller validates role, but handle defensively
            throw new BadRequestError('Invalid user role provided.');
        }

        const lessonPlans = await this.prisma.lessonPlan.findMany({
            where: whereClause,
            include: lessonPlanIncludes, // Use defined includes
            orderBy: { createdAt: 'desc' },
        });

        // Type assertion needed because Prisma includes are complex for TS to infer perfectly
        return lessonPlans.map(plan => toSharedLessonPlan(plan as PrismaLessonPlanWithRelations));
    }

    async updateLessonPlanStatus(
        updateDto: UpdateLessonPlanStatusDto,
        teacherId: string,
        actorRole: UserType
    ): Promise<LessonPlan> {
        const { lessonPlanId, transition, context } = updateDto;

        if (!isUuid(lessonPlanId)) {
            throw new BadRequestError('Invalid Lesson Plan ID format.');
        }

        const planWithStatusAndTeacher = await this.prisma.lessonPlan.findUnique({
            where: { id: lessonPlanId },
            include: {
                currentStatus: true,
                teacher: true // Assuming this include correctly populates teacher object
            },
        });

        if (!planWithStatusAndTeacher || !planWithStatusAndTeacher.currentStatus) {
            throw new NotFoundError(`Lesson plan with ID ${lessonPlanId} or its current status not found.`);
        }

        // Authorization: Only the teacher who created the plan can update its status
        if (actorRole !== UserType.TEACHER || !planWithStatusAndTeacher.teacher || planWithStatusAndTeacher.teacher.id !== teacherId) {
            throw new AuthorizationError('You are not authorized to update the status of this lesson plan.');
        }

        const currentStatusValue = planWithStatusAndTeacher.currentStatus.status as LessonPlanStatusValue;

        if (!LessonPlanStatus.isValidTransition(currentStatusValue, transition)) {
            throw new BadRequestError(`Invalid status transition (${transition}) from current status (${currentStatusValue}).`);
        }

        const newStatusValue = LessonPlanStatus.getResultingStatus(currentStatusValue, transition);
        if (!newStatusValue) {
            throw new BadRequestError('Could not determine resulting status for the transition.');
        }

        const newStatusId = uuidv4();

        const updatedPrismaLessonPlan = await this.prisma.$transaction(async (tx) => {
            await tx.lessonPlanStatus.create({
                data: {
                    id: newStatusId,
                    lessonPlanId: lessonPlanId,
                    status: newStatusValue,
                    context: context ?? undefined,
                },
            });

            return tx.lessonPlan.update({
                where: { id: lessonPlanId },
                data: { currentStatusId: newStatusId },
                include: lessonPlanIncludes // Use defined includes
            });
        });
        // Type assertion needed because Prisma includes are complex for TS to infer perfectly
        return toSharedLessonPlan(updatedPrismaLessonPlan as PrismaLessonPlanWithRelations);
    }
}

// Export singleton instance
export const lessonPlanService = new LessonPlanService(prismaClientInstance); 