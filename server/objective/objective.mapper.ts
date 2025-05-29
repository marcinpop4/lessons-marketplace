import { Objective as PrismaObjective, ObjectiveStatus as PrismaObjectiveStatus, LessonType as PrismaLessonType } from '@prisma/client';
import { Objective, ObjectiveProps } from '../../shared/models/Objective.js';
import { ObjectiveStatus, ObjectiveStatusValue } from '../../shared/models/ObjectiveStatus.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { JsonValue } from '../../shared/types/JsonTypes.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for objective mapper
const logger = createChildLogger('objective-mapper');

// Updated type alias: student relation is no longer required here
type PrismaObjectiveWithStatus = PrismaObjective & {
    currentStatus: PrismaObjectiveStatus | null;
};

/**
 * Maps a Prisma Objective (with its current status) to the shared Objective model.
 */
export const mapPrismaObjectiveToObjective = (prismaObjective: PrismaObjectiveWithStatus): Objective => {
    if (!prismaObjective.currentStatus) {
        logger.error(`[ObjectiveMapper] Objective ${prismaObjective.id} is missing currentStatus relation.`);
        throw new Error(`Objective ${prismaObjective.id} has no currentStatus. Data integrity issue.`);
    }

    const currentStatus = new ObjectiveStatus({
        id: prismaObjective.currentStatus.id,
        objectiveId: prismaObjective.currentStatus.objectiveId,
        status: prismaObjective.currentStatus.status as ObjectiveStatusValue, // Cast carefully!
        context: (prismaObjective.currentStatus.context as JsonValue) ?? null, // Cast context and handle nullish
        createdAt: prismaObjective.currentStatus.createdAt,
    });

    const objectiveProps: ObjectiveProps = {
        id: prismaObjective.id,
        studentId: prismaObjective.studentId,
        // student: undefined, // Explicitly undefined or simply omit
        lessonType: prismaObjective.lessonType as LessonType, // Cast from Prisma enum
        title: prismaObjective.title,
        description: prismaObjective.description,
        targetDate: prismaObjective.targetDate,
        currentStatusId: prismaObjective.currentStatusId,
        currentStatus: currentStatus,
        createdAt: prismaObjective.createdAt,
        updatedAt: prismaObjective.updatedAt,
    };

    return new Objective(objectiveProps);
};

/**
 * Maps an array of Prisma Objectives to an array of shared Objective models.
 */
export const mapPrismaObjectivesToObjectives = (prismaObjectives: PrismaObjectiveWithStatus[]): Objective[] => {
    return prismaObjectives.map(mapPrismaObjectiveToObjective);
}; 