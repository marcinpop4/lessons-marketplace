import {
    Milestone,
    MilestoneStatus,
    Lesson,
} from '@prisma/client';
import { Milestone as SharedMilestone } from '../../shared/models/Milestone.js';
import { MilestoneStatus as SharedMilestoneStatus, MilestoneStatusValue } from '../../shared/models/MilestoneStatus.js';
import { Lesson as SharedLesson } from '../../shared/models/Lesson.js';
import { JsonValue } from '@../../shared/types/JsonTypes.js'; // Assuming JsonValue is imported
import { createChildLogger } from '../config/logger.js';

// Create child logger for milestone mapper
const logger = createChildLogger('milestone-mapper');

export type PrismaMilestoneWithRelations = Milestone & {
    currentStatus?: MilestoneStatus | null;
    statuses: MilestoneStatus[];
    lessons: Lesson[]; // Assuming lessons under a milestone might also need their own relations mapped if complex
};

const toSharedMilestoneStatusMapper = (prismaStatus: MilestoneStatus): SharedMilestoneStatus => {
    return new SharedMilestoneStatus({
        id: prismaStatus.id,
        milestoneId: prismaStatus.milestoneId,
        status: prismaStatus.status as MilestoneStatusValue,
        context: prismaStatus.context === null ? null : prismaStatus.context as JsonValue, // Explicitly handle null and cast
        createdAt: prismaStatus.createdAt,
    });
};

// Placeholder for toSharedLesson - replace with actual import from lesson.mapper.ts when available
const toSharedLessonPlaceholder = (prismaLesson: Lesson): SharedLesson => {
    logger.warn('Using placeholder for toSharedLesson. Implement actual lesson mapper.');
    // This is a mock. In reality, this would call the actual lesson mapper.
    // It needs to map quote, currentStatus, statuses, lessonPlan, etc. for the Lesson model.
    return new SharedLesson({
        id: prismaLesson.id,
        // quote: mapPrismaQuoteToSharedQuote(prismaLesson.quote) // Placeholder for quote mapping
        quoteId: prismaLesson.quoteId, // Temporarily map IDs if full objects aren't needed yet by consumers
        // currentStatus and statuses for Lesson would be mapped here using LessonStatusMapper
        // lessonPlan, milestone etc.
        // For now, only basic fields to make it runnable
    } as any); // Using 'as any' because the SharedLesson constructor expects a full LessonQuote
    // This should be fixed by using a proper LessonMapper for the quote and other relations.
};

export const toSharedMilestone = (
    prismaMilestone: PrismaMilestoneWithRelations
): SharedMilestone => {
    return new SharedMilestone({
        id: prismaMilestone.id,
        lessonPlanId: prismaMilestone.lessonPlanId,
        title: prismaMilestone.title,
        description: prismaMilestone.description,
        dueDate: prismaMilestone.dueDate,
        currentStatusId: prismaMilestone.currentStatusId,
        currentStatus: prismaMilestone.currentStatus
            ? toSharedMilestoneStatusMapper(prismaMilestone.currentStatus)
            : null,
        statuses: prismaMilestone.statuses.map(toSharedMilestoneStatusMapper),
        lessons: prismaMilestone.lessons.map(toSharedLessonPlaceholder), // Use placeholder for now
        createdAt: prismaMilestone.createdAt,
        updatedAt: prismaMilestone.updatedAt,
    });
}; 