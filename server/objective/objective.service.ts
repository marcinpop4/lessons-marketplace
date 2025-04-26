import { PrismaClient, Prisma, Objective as PrismaObjective } from '@prisma/client';
import { Objective } from '@shared/models/Objective.js';
import { ObjectiveStatus, ObjectiveStatusValue, ObjectiveStatusTransition } from '@shared/models/ObjectiveStatus.js';
import { LessonType } from '@shared/models/LessonType.js';
import { mapPrismaObjectiveToObjective, mapPrismaObjectivesToObjectives } from './objective.mapper.js';
import { NotFoundError, BadRequestError } from '../errors/index.js';

const prisma = new PrismaClient();

// Include necessary relations for mapping
const objectiveInclude = Prisma.validator<Prisma.ObjectiveInclude>()({
    currentStatus: true,
    // We don't strictly need student here based on the simplified mapper,
    // but keep it if other parts of the service might need it later.
    // If not, it can be removed for efficiency.
    // student: true,
});

/**
 * Fetches all objectives for a specific student.
 *
 * @param studentId - The ID of the student.
 * @returns A promise resolving to an array of Objective objects.
 */
export const getObjectivesByStudentId = async (studentId: string): Promise<Objective[]> => {
    const prismaObjectives = await prisma.objective.findMany({
        where: { studentId: studentId },
        include: objectiveInclude, // Include current status
        orderBy: { createdAt: 'desc' },
    });

    // Filter out objectives that might have inconsistent data (e.g., missing status)
    const validObjectives = prismaObjectives.filter(o => o.currentStatus !== null) as (PrismaObjective & { currentStatus: NonNullable<PrismaObjective['currentStatus']> })[];

    return mapPrismaObjectivesToObjectives(validObjectives);
};

/**
 * Creates a new objective for a student.
 *
 * @param studentId - The ID of the student creating the objective.
 * @param title - The title of the objective.
 * @param description - The description of the objective.
 * @param lessonType - The type of lesson the objective relates to.
 * @param targetDate - The target completion date for the objective.
 * @returns A promise resolving to the newly created Objective object.
 */
export const createObjective = async (
    studentId: string,
    title: string,
    description: string,
    lessonType: LessonType,
    targetDate: Date
): Promise<Objective> => {
    // Validate input
    if (!title || !description || !lessonType || !targetDate) {
        throw new BadRequestError('Missing required fields for objective creation.');
    }
    if (!Object.values(LessonType).includes(lessonType)) {
        throw new BadRequestError(`Invalid lesson type: ${lessonType}`);
    }

    const newObjectiveResult = await prisma.$transaction(async (tx) => {
        // 1. Create the objective *without* status links initially
        const createdObjective = await tx.objective.create({
            data: {
                studentId: studentId,
                title: title,
                description: description,
                lessonType: lessonType,
                targetDate: targetDate,
                // currentStatusId and statuses omitted for now
            },
        });

        // 2. Create the initial status, linking it to the new objective
        const initialStatus = await tx.objectiveStatus.create({
            data: {
                objectiveId: createdObjective.id, // Link using the ID from step 1
                status: ObjectiveStatusValue.CREATED,
            },
        });

        // 3. Update the objective to link the currentStatusId and connect the status history
        const finalObjectiveWithStatus = await tx.objective.update({
            where: { id: createdObjective.id },
            data: {
                currentStatusId: initialStatus.id, // Set the foreign key
                statuses: {
                    connect: { id: initialStatus.id } // Connect the relation
                }
            },
            include: objectiveInclude, // Include relations for the final mapping
        });

        return finalObjectiveWithStatus;
    });

    // Ensure the returned object conforms to the expected structure with non-null status
    // (This check might be overly cautious now but good safeguard)
    if (!newObjectiveResult.currentStatus) {
        console.error(`[ObjectiveService] Failed to retrieve currentStatus for newly created objective ${newObjectiveResult.id}`);
        throw new Error("Failed to create objective with status.");
    }

    return mapPrismaObjectiveToObjective(newObjectiveResult); // Use the mapper
};

/**
 * Finds a single objective by its ID.
 * Basic lookup, primarily for ownership checks or direct retrieval.
 * Does NOT include relations by default unless specified in include options.
 *
 * @param objectiveId - The ID of the objective to find.
 * @returns A promise resolving to the PrismaObjective or null.
 */
export const findObjectiveById = async (
    objectiveId: string
): Promise<PrismaObjective | null> => {
    if (!objectiveId) {
        return null; // Or throw BadRequestError if ID is required
    }
    return prisma.objective.findUnique({
        where: { id: objectiveId },
    });
};

/**
 * Updates the status of an existing objective.
 * Uses the ABANDON transition for soft deletion.
 *
 * @param objectiveId - The ID of the objective to update.
 * @param newStatusValue - The target status value (e.g., ACHIEVED, ABANDONED).
 * @param context - Optional context for the status change.
 * @returns A promise resolving to the updated Objective object.
 */
export const updateObjectiveStatus = async (
    objectiveId: string,
    newStatusValue: ObjectiveStatusValue,
    context?: Prisma.InputJsonObject
): Promise<Objective> => {
    if (!objectiveId || !newStatusValue) {
        throw new BadRequestError('Objective ID and new status are required.');
    }

    // Validate the target status
    if (!Object.values(ObjectiveStatusValue).includes(newStatusValue)) {
        throw new BadRequestError(`Invalid target status value: ${newStatusValue}`);
    }

    const updatedObjective = await prisma.$transaction(async (tx) => {
        // 1. Fetch the current objective and its status
        const currentObjective = await tx.objective.findUnique({
            where: { id: objectiveId },
            include: { currentStatus: true },
        });

        if (!currentObjective) {
            throw new NotFoundError(`Objective with ID ${objectiveId} not found.`);
        }
        if (!currentObjective.currentStatus) {
            throw new Error(`Objective ${objectiveId} is missing its current status relationship.`);
        }

        const currentStatusValue = currentObjective.currentStatus.status as ObjectiveStatusValue;

        // 2. Determine the required transition
        let requiredTransition: ObjectiveStatusTransition | null = null;
        for (const transition in ObjectiveStatus.StatusTransitions[currentStatusValue]) {
            const targetStatus = ObjectiveStatus.getResultingStatus(currentStatusValue, transition as ObjectiveStatusTransition);
            if (targetStatus === newStatusValue) {
                requiredTransition = transition as ObjectiveStatusTransition;
                break;
            }
        }

        // 3. Validate the transition
        if (!requiredTransition) {
            throw new BadRequestError(`Transition from ${currentStatusValue} to ${newStatusValue} is not defined.`);
        }
        if (!ObjectiveStatus.isValidTransition(currentStatusValue, requiredTransition)) {
            throw new BadRequestError(`Invalid status transition from ${currentStatusValue} using ${requiredTransition}.`);
        }

        // 4. Create the new status record
        const newStatus = await tx.objectiveStatus.create({
            data: {
                objectiveId: objectiveId,
                status: newStatusValue,
                context: context,
            },
        });

        // 5. Update the objective to point to the new status
        const objectiveWithNewStatus = await tx.objective.update({
            where: { id: objectiveId },
            data: {
                currentStatusId: newStatus.id,
                // Also connect the new status to the history
                statuses: {
                    connect: { id: newStatus.id }
                }
            },
            include: objectiveInclude, // Include relations for mapping
        });

        // Manually attach the newly created status object for the mapper
        // as the update operation doesn't automatically return the nested relation object
        // based on the new ID within the same transaction context easily.
        const finalObjective = {
            ...objectiveWithNewStatus,
            currentStatus: newStatus,
        };

        return finalObjective;
    });

    // Ensure the returned object conforms to the expected structure
    if (!updatedObjective.currentStatus) {
        console.error(`[ObjectiveService] Failed to retrieve currentStatus for updated objective ${objectiveId}`);
        throw new Error("Failed to update objective status.");
    }

    return mapPrismaObjectiveToObjective(updatedObjective as any); // Use the mapper
}; 