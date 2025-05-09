import {
    LessonPlan,
    LessonPlanStatus,
    Milestone,
    Lesson as PrismaLesson,
    Teacher as PrismaTeacher,
    Student as PrismaStudent,
    LessonQuote as PrismaLessonQuote,
    LessonRequest as PrismaLessonRequest
} from '@prisma/client';
import { LessonPlan as SharedLessonPlan } from '../../shared/models/LessonPlan.js'; // Alias to avoid name clash
import { LessonPlanStatus as SharedLessonPlanStatus, LessonPlanStatusValue } from '../../shared/models/LessonPlanStatus.js'; // Alias
import { Milestone as SharedMilestone } from '../../shared/models/Milestone.js'; // Alias
import { JsonValue } from '../../shared/types/JsonTypes.js'; // Assuming JsonValue is imported if not globally available

// Define a more specific type for Prisma LessonPlan when relations are included
export type PrismaLessonPlanWithRelations = LessonPlan & {
    currentStatus?: LessonPlanStatus | null;
    statuses: LessonPlanStatus[];
    milestones: Milestone[];
    lesson?: (PrismaLesson & {
        quote: (PrismaLessonQuote & {
            teacher: PrismaTeacher;
            lessonRequest: (PrismaLessonRequest & {
                student: PrismaStudent;
            });
        });
    }) | null;
    teacher: PrismaTeacher;
};

// Helper to map Prisma LessonPlanStatus to shared LessonPlanStatus
const toSharedLessonPlanStatusMapper = (prismaStatus: LessonPlanStatus): SharedLessonPlanStatus => {
    return new SharedLessonPlanStatus({
        id: prismaStatus.id,
        lessonPlanId: prismaStatus.lessonPlanId,
        status: prismaStatus.status as LessonPlanStatusValue, // Prisma enum is string, cast to shared enum
        context: prismaStatus.context === null ? null : prismaStatus.context as JsonValue,
        createdAt: prismaStatus.createdAt,
    });
};

// Placeholder for toSharedMilestone - replace with actual import and usage
const toSharedMilestonePlaceholder = (prismaMilestone: Milestone): SharedMilestone => {
    console.warn('Using placeholder for toSharedMilestone. Implement actual milestone mapper.');
    return new SharedMilestone({
        id: prismaMilestone.id,
        lessonPlanId: prismaMilestone.lessonPlanId,
        title: prismaMilestone.title,
        description: prismaMilestone.description,
        dueDate: prismaMilestone.dueDate,
        // currentStatus and statuses for Milestone would be mapped here using MilestoneStatusMapper
    });
};


export const toSharedLessonPlan = (
    prismaLessonPlan: PrismaLessonPlanWithRelations
): SharedLessonPlan => {
    return new SharedLessonPlan({
        id: prismaLessonPlan.id,
        lessonId: prismaLessonPlan.lessonId,
        title: prismaLessonPlan.title,
        description: prismaLessonPlan.description,
        dueDate: prismaLessonPlan.dueDate,
        currentStatusId: prismaLessonPlan.currentStatusId,
        currentStatus: prismaLessonPlan.currentStatus
            ? toSharedLessonPlanStatusMapper(prismaLessonPlan.currentStatus)
            : null,
        statuses: prismaLessonPlan.statuses.map(toSharedLessonPlanStatusMapper),
        milestones: prismaLessonPlan.milestones.map(toSharedMilestonePlaceholder),
        createdAt: prismaLessonPlan.createdAt,
        updatedAt: prismaLessonPlan.updatedAt,
    });
}; 