import { PrismaClient, UserType, LessonPlan, Milestone as PrismaMilestone } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Milestone } from '@shared/models/Milestone.js';
import { MilestoneStatus, MilestoneStatusValue, MilestoneStatusTransition } from '@shared/models/MilestoneStatus.js';
import { CreateMilestoneDto, UpdateMilestoneStatusDto } from './milestone.dto.js';
import { toSharedMilestone, PrismaMilestoneWithRelations } from './milestone.mapper.js';
import {
    NotFoundError,
    BadRequestError,
} from '../errors/index.js';
import { AuthorizationError } from '../errors/authorization.error.js';
import prismaClientInstance from '../prisma.js';
import { isUuid } from '../utils/validation.utils.js';


interface GetMilestonesParams {
    lessonPlanId?: string;
    actorId: string;
    actorRole: UserType;
}

export class MilestoneService {
    constructor(private readonly prisma: PrismaClient = prismaClientInstance) { }

    /**
     * Create a new milestone for a lesson plan.
     */
    async createMilestone(
        createDto: CreateMilestoneDto,
        actorUserId: string,
        actorRole: UserType
    ): Promise<Milestone> {
        const { lessonPlanId, title, description, dueDate } = createDto;

        if (!lessonPlanId || !title || !description || !dueDate) {
            throw new BadRequestError('Lesson plan ID, title, description, and due date are required.');
        }
        if (!isUuid(lessonPlanId)) {
            throw new BadRequestError('Lesson Plan ID must be a valid UUID.');
        }

        // Fetch the lesson plan to check existence and get teacher ID for authorization
        const lessonPlan = await this.prisma.lessonPlan.findUnique({
            where: { id: lessonPlanId },
            select: {
                id: true,
                teacher: { select: { id: true } }
            },
        });

        if (!lessonPlan) {
            throw new NotFoundError(`Lesson plan with ID ${lessonPlanId} not found.`);
        }

        // Authorization: Only the teacher associated with the lesson plan can create milestones
        if (actorRole !== UserType.TEACHER || lessonPlan.teacher?.id !== actorUserId) {
            throw new AuthorizationError('You are not authorized to add milestones to this lesson plan.');
        }

        const milestoneId = uuidv4();
        const initialStatusId = uuidv4();

        const createdPrismaMilestone = await this.prisma.$transaction(async (tx) => {
            // 1. Create the initial status
            await tx.milestoneStatus.create({
                data: {
                    id: initialStatusId,
                    status: MilestoneStatusValue.CREATED,
                    milestone: { connect: { id: milestoneId } }
                }
            });

            // 2. Create the milestone
            const newMilestone = await tx.milestone.create({
                data: {
                    id: milestoneId,
                    title,
                    description,
                    dueDate,
                    lessonPlan: { connect: { id: lessonPlanId } },
                    currentStatus: { connect: { id: initialStatusId } },
                },
                include: { // Include relations needed by mapper
                    currentStatus: true,
                    statuses: true,
                    lessons: true,
                    lessonPlan: true,
                },
            });
            return newMilestone;
        });

        return toSharedMilestone(createdPrismaMilestone as PrismaMilestoneWithRelations);
    }

    /**
     * Get milestones, optionally filtered by lessonPlanId.
     * Ensures the actor has permission to view the milestones.
     */
    async getMilestones(params: GetMilestonesParams): Promise<Milestone[]> {
        const { lessonPlanId, actorId, actorRole } = params;

        const includeClause = {
            currentStatus: true,
            statuses: true,
            lessons: true,
            lessonPlan: {
                include: {
                    lesson: {
                        include: {
                            quote: { include: { teacher: true, lessonRequest: { include: { student: true } } } }
                        }
                    }
                }
            }
        };

        if (lessonPlanId) {
            if (!isUuid(lessonPlanId)) {
                throw new BadRequestError('Lesson Plan ID must be a valid UUID.');
            }
            const lessonPlan = await this.prisma.lessonPlan.findUnique({
                where: { id: lessonPlanId },
                include: {
                    lesson: { include: { quote: { select: { teacherId: true, lessonRequest: { select: { studentId: true } } } } } },
                    milestones: {
                        include: includeClause,
                        orderBy: { dueDate: 'asc' }
                    }
                }
            });

            if (!lessonPlan) {
                throw new NotFoundError(`Lesson plan with ID ${lessonPlanId} not found.`);
            }

            const isTeacher = lessonPlan.lesson?.quote?.teacherId === actorId;
            const isStudent = lessonPlan.lesson?.quote?.lessonRequest?.studentId === actorId;
            if (!isTeacher && !isStudent) {
                throw new AuthorizationError('You are not authorized to view milestones for this lesson plan.');
            }
            return lessonPlan.milestones.map(m => toSharedMilestone(m as PrismaMilestoneWithRelations));
        } else {
            // No lessonPlanId provided, fetch based on actor role
            let milestones: PrismaMilestoneWithRelations[] = [];
            if (actorRole === UserType.TEACHER) {
                milestones = await this.prisma.milestone.findMany({
                    where: {
                        lessonPlan: { teacher: { id: actorId } }
                    },
                    include: includeClause,
                    orderBy: { dueDate: 'asc' }
                }) as PrismaMilestoneWithRelations[];
            } else if (actorRole === UserType.STUDENT) {
                milestones = await this.prisma.milestone.findMany({
                    where: {
                        lessonPlan: {
                            lesson: { quote: { lessonRequest: { studentId: actorId } } }
                        }
                    },
                    include: includeClause,
                    orderBy: { dueDate: 'asc' }
                }) as PrismaMilestoneWithRelations[];
            }
            // Other roles will get an empty array if no specific lessonPlanId is given
            return milestones.map(m => toSharedMilestone(m));
        }
    }

    /**
     * Get a specific milestone by its ID.
     */
    async getMilestoneById(milestoneId: string, actorUserId: string): Promise<Milestone | null> {
        if (!isUuid(milestoneId)) {
            throw new BadRequestError('Milestone ID must be a valid UUID.');
        }
        const milestone = await this.prisma.milestone.findUnique({
            where: { id: milestoneId },
            include: {
                currentStatus: true,
                statuses: true,
                lessons: true,
                lessonPlan: {
                    include: {
                        teacher: true,
                        lesson: { include: { quote: { include: { teacher: true, lessonRequest: { include: { student: true } } } } } }
                    }
                }
            }
        });

        if (!milestone || !milestone.lessonPlan) {
            throw new NotFoundError(`Milestone with ID ${milestoneId} not found or has no associated lesson plan.`);
        }

        const lessonPlan = milestone.lessonPlan;
        // Corrected Authorization:
        let authorized = false;
        // 1. Is the actor the teacher who owns the plan?
        if (lessonPlan.teacher?.id === actorUserId) {
            authorized = true;
            // 2. If not the plan owner, check if it's linked to a lesson and actor is lesson teacher/student
        } else if (lessonPlan.lesson) {
            const isLessonTeacher = lessonPlan.lesson.quote?.teacherId === actorUserId;
            const isLessonStudent = lessonPlan.lesson.quote?.lessonRequest?.studentId === actorUserId;
            if (isLessonTeacher || isLessonStudent) {
                authorized = true;
            }
        }

        if (!authorized) {
            throw new AuthorizationError('You are not authorized to view this milestone.');
        }

        return toSharedMilestone(milestone as PrismaMilestoneWithRelations);
    }

    /**
     * Update the status of a milestone.
     */
    async updateMilestoneStatus(
        updateDto: UpdateMilestoneStatusDto,
        actorUserId: string,
        actorRole: UserType
    ): Promise<Milestone> {
        const { milestoneId, transition, context } = updateDto;

        if (!isUuid(milestoneId)) {
            throw new BadRequestError('Milestone ID must be a valid UUID.');
        }

        // Fetch milestone with current status and lesson plan info for auth
        const milestoneWithStatus = await this.prisma.milestone.findUnique({
            where: { id: milestoneId },
            include: {
                currentStatus: true,
                lessonPlan: {
                    select: { teacherId: true }
                }
            }
        });

        if (!milestoneWithStatus || !milestoneWithStatus.currentStatus || !milestoneWithStatus.lessonPlan) {
            throw new NotFoundError(`Milestone with ID ${milestoneId}, its status, or associated lesson plan not found.`);
        }

        // Authorization: Use direct teacherId from LessonPlan
        if (actorRole !== UserType.TEACHER || milestoneWithStatus.lessonPlan.teacherId !== actorUserId) {
            throw new AuthorizationError('You are not authorized to update the status of this milestone.');
        }

        const currentStatusValue = milestoneWithStatus.currentStatus.status as MilestoneStatusValue;

        if (!MilestoneStatus.isValidTransition(currentStatusValue, transition)) {
            throw new BadRequestError(`Invalid status transition (${transition}) from current status (${currentStatusValue}).`);
        }

        const newStatusValue = MilestoneStatus.getResultingStatus(currentStatusValue, transition);
        if (!newStatusValue) {
            throw new BadRequestError('Could not determine resulting status for the transition.');
        }

        const newStatusId = uuidv4();

        const updatedPrismaMilestone = await this.prisma.$transaction(async (tx) => {
            await tx.milestoneStatus.create({
                data: {
                    id: newStatusId,
                    milestoneId: milestoneId,
                    status: newStatusValue,
                    context: context ?? undefined,
                }
            });

            return tx.milestone.update({
                where: { id: milestoneId },
                data: { currentStatusId: newStatusId },
                include: {
                    currentStatus: true,
                    statuses: true,
                    lessons: true,
                    lessonPlan: true,
                }
            });
        });

        return toSharedMilestone(updatedPrismaMilestone as PrismaMilestoneWithRelations);
    }
}

export const milestoneService = new MilestoneService(prismaClientInstance); 