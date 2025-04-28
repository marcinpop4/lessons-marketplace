import { PrismaClient, Prisma, Objective as PrismaObjective, Student } from '@prisma/client';
import { Objective } from '@shared/models/Objective.js';
import { ObjectiveStatus, ObjectiveStatusValue, ObjectiveStatusTransition } from '@shared/models/ObjectiveStatus.js';
import { LessonType } from '@shared/models/LessonType.js';
import { mapPrismaObjectiveToObjective, mapPrismaObjectivesToObjectives } from './objective.mapper.js';
import { NotFoundError, BadRequestError } from '../errors/index.js';
import { studentService } from '../student/student.service.js';
import OpenAI from 'openai';
import { Response } from 'express';
import { streamJsonResponse } from '../utils/sse.service.js';
import { ObjectiveRecommendation } from '@shared/models/ObjectiveRecommendation.js';
import { isUuid } from '../utils/validation.utils.js';
import prisma from '../prisma.js'; // Import shared prisma instance

// Define the recommendation count constant
const DEFAULT_RECOMMENDATION_COUNT = 6;
const MAX_RECOMMENDATIONS = 10; // Keep MAX for potential future use or validation

const openai = new OpenAI(); // Initialize OpenAI client (implicitly uses process.env.OPENAI_API_KEY)

// Keep mapper functions module-scoped as they don't need instance state

// Include necessary relations for mapping (can stay module-scoped)
const objectiveInclude = Prisma.validator<Prisma.ObjectiveInclude>()({
    currentStatus: true,
});

// Helper functions can also remain module-scoped or become private static methods
/**
 * Prepares prompts for OpenAI objective generation.
 */
const _prepareObjectivePrompts = (
    student: Pick<Student, 'id' | 'firstName' | 'lastName'>, // Use the simpler Pick type
    lessonType: LessonType | null,
    currentObjectives: Objective[],
): { systemPrompt: string, userPrompt: string } => {
    const systemPrompt = `You are an assistant helping a student set learning objectives. Based on the student's profile and their current objectives, suggest ${DEFAULT_RECOMMENDATION_COUNT} new potential objectives. Consider the optional lesson type filter. Each objective should have a title, description, targetDate (suggest a reasonable future date like 1 month from now in YYYY-MM-DD format), and potentially relate to the given lessonType if provided. Respond ONLY with a valid JSON array of these objective objects, like this: [{ "title": "Objective 1", "description": "Desc 1", "lessonType": "GUITAR" | null, "targetDate": "YYYY-MM-DD" }, { ... }]`;
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const suggestedTargetDate = futureDate.toISOString().split('T')[0];
    const studentInfo = `Student: ${student.firstName} ${student.lastName}.`;
    const lessonTypeInfo = lessonType ? `Focus Lesson Type: ${lessonType}` : 'No specific lesson type focus.';
    const currentObjectivesInfo = `Current Objectives (${currentObjectives.length}):\n${currentObjectives.map(o => `- ${o.title} (Type: ${o.lessonType}, Status: ${o.currentStatus.status}, Target: ${o.targetDate.toISOString().split('T')[0]})`).join('\n') || 'None'}`;
    const userPrompt = `Please generate ${DEFAULT_RECOMMENDATION_COUNT} objectives for the student based on this context. Remember the suggested target date is ${suggestedTargetDate} but adjust if sensible. Only generate the JSON array.\nContext:\n${studentInfo}\n${lessonTypeInfo}\n${currentObjectivesInfo}`;
    return { systemPrompt, userPrompt };
};

/**
 * Parses and validates the raw string response from OpenAI into an array of ObjectiveRecommendations.
 */
const _parseAndValidateObjectiveRecommendations = (responseText: string | null | undefined): ObjectiveRecommendation[] => {
    if (!responseText) { console.warn('[ObjectiveService] OpenAI response was empty.'); return []; }
    try {
        const parsed = JSON.parse(responseText);
        if (!Array.isArray(parsed)) { console.warn('[ObjectiveService] OpenAI response was not a JSON array:', parsed); return []; }
        const recommendations: ObjectiveRecommendation[] = [];
        for (const item of parsed) {
            if (item && typeof item.title === 'string' && typeof item.description === 'string') {
                recommendations.push({
                    title: item.title,
                    description: item.description,
                    lessonType: Object.values(LessonType).includes(item.lessonType as LessonType) ? item.lessonType as LessonType : null,
                    targetDate: typeof item.targetDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(item.targetDate) ? item.targetDate : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                });
            }
        }
        return recommendations;
    } catch (error) { console.error('[ObjectiveService] Error parsing OpenAI response:', error); console.error('[ObjectiveService] Raw OpenAI response:', responseText); return []; }
};

class ObjectiveService {
    // Use the shared prisma instance
    private readonly prisma = prisma;

    /**
     * Fetches all objectives for a specific student.
     */
    async getObjectivesByStudentId(studentId: string): Promise<Objective[]> {
        type ObjectiveWithStatus = Prisma.ObjectiveGetPayload<{ include: typeof objectiveInclude }>;

        const prismaObjectives: ObjectiveWithStatus[] = await this.prisma.objective.findMany({
            where: { studentId: studentId },
            include: objectiveInclude,
            orderBy: { createdAt: 'desc' },
        });

        const validObjectives = prismaObjectives.filter(
            (o): o is ObjectiveWithStatus & { currentStatus: NonNullable<ObjectiveWithStatus['currentStatus']> } =>
                o.currentStatus !== null
        );
        // Use module-scoped mapper
        return mapPrismaObjectivesToObjectives(validObjectives);
    }

    /**
     * Creates a new objective for a student.
     */
    async createObjective(
        studentId: string,
        title: string,
        description: string,
        lessonType: LessonType,
        targetDate: Date
    ): Promise<Objective> {
        if (!studentId || !title || !description || !lessonType || !targetDate) {
            throw new BadRequestError('Missing required fields for objective creation.');
        }
        if (!Object.values(LessonType).includes(lessonType)) {
            throw new BadRequestError(`Invalid lesson type: ${lessonType}`);
        }

        const newObjectiveResult = await this.prisma.$transaction(async (tx) => {
            const createdObjective = await tx.objective.create({
                data: { studentId, title, description, lessonType, targetDate },
            });
            const initialStatus = await tx.objectiveStatus.create({
                data: { objectiveId: createdObjective.id, status: ObjectiveStatusValue.CREATED },
            });
            const finalObjectiveWithStatus = await tx.objective.update({
                where: { id: createdObjective.id },
                data: {
                    currentStatusId: initialStatus.id,
                    statuses: { connect: { id: initialStatus.id } }
                },
                include: objectiveInclude,
            });
            return finalObjectiveWithStatus;
        });

        if (!newObjectiveResult.currentStatus) {
            console.error(`[ObjectiveService] Failed to retrieve currentStatus for newly created objective ${newObjectiveResult.id}`);
            throw new Error("Failed to create objective with status.");
        }
        // Use module-scoped mapper
        return mapPrismaObjectiveToObjective(newObjectiveResult);
    }

    /**
     * Finds a single objective by its ID (basic lookup).
     */
    async findObjectiveById(objectiveId: string): Promise<PrismaObjective | null> {
        if (!objectiveId) {
            return null;
        }
        return this.prisma.objective.findUnique({
            where: { id: objectiveId },
        });
    }

    /**
     * Updates the status of an existing objective.
     */
    async updateObjectiveStatus(
        objectiveId: string,
        newStatusValue: ObjectiveStatusValue,
        context?: Prisma.InputJsonObject
    ): Promise<Objective> {
        if (!objectiveId || !newStatusValue) {
            throw new BadRequestError('Objective ID and new status are required.');
        }
        if (!Object.values(ObjectiveStatusValue).includes(newStatusValue)) {
            throw new BadRequestError(`Invalid target status value: ${newStatusValue}`);
        }

        const updatedObjective = await this.prisma.$transaction(async (tx) => {
            const currentObjective = await tx.objective.findUnique({
                where: { id: objectiveId },
                include: { currentStatus: true },
            });

            if (!currentObjective) throw new NotFoundError(`Objective with ID ${objectiveId} not found.`);
            if (!currentObjective.currentStatus) throw new Error(`Objective ${objectiveId} is missing status.`);

            const currentStatusValue = currentObjective.currentStatus.status as ObjectiveStatusValue;
            let requiredTransition: ObjectiveStatusTransition | null = null;
            for (const transition in ObjectiveStatus.StatusTransitions[currentStatusValue]) {
                const targetStatus = ObjectiveStatus.getResultingStatus(currentStatusValue, transition as ObjectiveStatusTransition);
                if (targetStatus === newStatusValue) { requiredTransition = transition as ObjectiveStatusTransition; break; }
            }

            if (!requiredTransition) throw new BadRequestError(`Transition from ${currentStatusValue} to ${newStatusValue} is not defined.`);
            if (!ObjectiveStatus.isValidTransition(currentStatusValue, requiredTransition)) throw new BadRequestError(`Invalid status transition from ${currentStatusValue} using ${requiredTransition}.`);

            const newStatus = await tx.objectiveStatus.create({
                data: { objectiveId, status: newStatusValue, context: context },
            });
            const objectiveWithNewStatus = await tx.objective.update({
                where: { id: objectiveId },
                data: {
                    currentStatusId: newStatus.id,
                    statuses: { connect: { id: newStatus.id } }
                },
                include: objectiveInclude,
            });
            // Manually attach for mapper
            const finalObjective = { ...objectiveWithNewStatus, currentStatus: newStatus };
            return finalObjective;
        });

        if (!updatedObjective.currentStatus) {
            console.error(`[ObjectiveService] Failed to retrieve currentStatus for updated objective ${objectiveId}`);
            throw new Error("Failed to update objective status.");
        }
        // Use module-scoped mapper
        return mapPrismaObjectiveToObjective(updatedObjective);
    }

    // === AI Objective Recommendation Methods ===

    /**
     * Async generator function for generating objective recommendations.
     */
    async * _generateObjectiveRecommendationsStream(
        studentId: string,
        lessonType: LessonType | null
    ): AsyncGenerator<ObjectiveRecommendation, void, unknown> {
        const student = await studentService.findById(studentId);
        if (!student) throw new NotFoundError(`Student with ID ${studentId} not found.`);
        // Use instance method to get current objectives
        const currentObjectives = await this.getObjectivesByStudentId(studentId);

        // Call _prepareObjectivePrompts without count
        const { systemPrompt, userPrompt } = _prepareObjectivePrompts(student, lessonType, currentObjectives);

        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            stream: true,
            temperature: 0.7,
            n: 1,
        });

        let accumulatedJson = '';
        let objectDepth = 0;
        let recommendationsSent = 0;
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            accumulatedJson += content;
            for (const char of content) { if (char === '{') objectDepth++; if (char === '}') objectDepth--; }
            if (objectDepth === 0 && accumulatedJson.trim().startsWith('{') && accumulatedJson.trim().endsWith('}')) {
                try {
                    const potentialRec = JSON.parse(accumulatedJson.trim());
                    const validatedRecs = _parseAndValidateObjectiveRecommendations(JSON.stringify([potentialRec]));
                    if (validatedRecs.length > 0) {
                        yield validatedRecs[0];
                        recommendationsSent++;
                        accumulatedJson = '';
                        // Use constant for check
                        if (recommendationsSent >= DEFAULT_RECOMMENDATION_COUNT) {
                            stream.controller.abort();
                            break;
                        }
                    }
                } catch (e) { /* Incomplete JSON */ }
            }
        }
    }

    /**
     * Public method to initiate streaming objective recommendations.
     */
    async streamObjectiveRecommendations(
        studentId: string,
        lessonType: LessonType | null,
        res: Response
    ): Promise<void> {
        // Remove count validation, use MAX_RECOMMENDATIONS if needed elsewhere
        if (!studentId || !isUuid(studentId)) throw new BadRequestError('Valid Student ID is required.');
        // Removed count validation block
        if (lessonType && !Object.values(LessonType).includes(lessonType)) throw new BadRequestError(`Invalid lesson type: ${lessonType}`);

        // Pass instance method as the generator function, call without count
        const generator = () => this._generateObjectiveRecommendationsStream(studentId, lessonType);

        await streamJsonResponse(res, generator, (error) => {
            console.error(`[Objective Service] Error during objective recommendation streaming for student ${studentId}:`, error);
        });
    }
}

// Export a singleton instance of the class
export const objectiveService = new ObjectiveService(); 