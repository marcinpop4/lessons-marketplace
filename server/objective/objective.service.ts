import { PrismaClient, Prisma, Objective as PrismaObjective, Student } from '@prisma/client';
import { Objective } from '../../shared/models/Objective.js';
import { ObjectiveStatus, ObjectiveStatusValue, ObjectiveStatusTransition } from '../../shared/models/ObjectiveStatus.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { mapPrismaObjectiveToObjective, mapPrismaObjectivesToObjectives } from './objective.mapper.js';
import { NotFoundError, BadRequestError, AppError } from '../errors/index.js';
import { studentService } from '../student/student.service.js';
import OpenAI from 'openai';
import { Response } from 'express';
import { streamJsonResponse } from '../utils/sse.service.js';
import { ObjectiveRecommendation } from '../../shared/models/ObjectiveRecommendation.js';
import { isUuid } from '../utils/validation.utils.js';
import prisma from '../prisma.js'; // Import shared prisma instance
import { logAndYieldAiStream } from '../utils/aiStream.utils.js'; // Import the AI stream utility
import { ChatCompletionChunk } from 'openai/resources/chat/completions'; // Import necessary type
import { lessonService } from '../lesson/lesson.service.js'; // Import lessonService
import { Lesson } from '../../shared/models/Lesson.js'; // Import Lesson model
import { LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { v4 as uuidv4 } from 'uuid';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for objective service
const logger = createChildLogger('objective-service');

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
    student: Pick<Student, 'id' | 'firstName' | 'lastName'>,
    lessonType: LessonType, // Now required
    currentObjectives: Objective[], // Should be pre-filtered
    pastLessons: Lesson[] // Add past lessons context
): { systemPrompt: string, userPrompt: string } => {
    // Updated System Prompt
    const systemPrompt = `You are an assistant helping a student set learning objectives for a specific lesson type. Based on the student's profile, their current objectives *for this lesson type*, and their past lesson history *for this lesson type*, suggest ${DEFAULT_RECOMMENDATION_COUNT} new potential objectives relevant to the lesson type: ${lessonType}. Each objective must have a title, description, targetDate (suggest a reasonable future date like 1 month from now in YYYY-MM-DD format), and a difficulty (Beginner, Intermediate, Advanced). Respond ONLY with a valid JSON array of these objective objects, like this: [{ "title": "Objective 1", "description": "Desc 1", "lessonType": "${lessonType}", "targetDate": "YYYY-MM-DD", "difficulty": "Beginner" }, { ... }]`;

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const suggestedTargetDate = futureDate.toISOString().split('T')[0];

    const studentInfo = `Student: ${student.firstName} ${student.lastName}.`;
    const lessonTypeInfo = `Target Lesson Type: ${lessonType}`; // Lesson type is now mandatory context

    // Current objectives are pre-filtered, so the count reflects relevance
    const currentObjectivesInfo = `Current Objectives for ${lessonType} (${currentObjectives.length}):\n${currentObjectives.map(o => `- ${o.title} (Status: ${o.currentStatus.status}, Target: ${o.targetDate.toISOString().split('T')[0]})`).join('\n') || 'None'}`;

    // Format past lesson information relevant to the lesson type
    const pastLessonsInfo = `Past ${lessonType} Lessons Summary (${pastLessons.length}):\n${pastLessons.map(l => `- Date: ${l.getStartTime().toISOString().split('T')[0]}, Status: ${l.currentStatus?.status ?? 'N/A'}`).join('\n') || 'None'}`;

    // Updated User Prompt
    const userPrompt = `Please generate ${DEFAULT_RECOMMENDATION_COUNT} objectives for the student focused on ${lessonType}. Remember the suggested target date is ${suggestedTargetDate} but adjust if sensible. Ensure each objective includes a difficulty level (Beginner, Intermediate, Advanced). Only generate the JSON array.\nContext:\n${studentInfo}\n${lessonTypeInfo}\n${currentObjectivesInfo}\n${pastLessonsInfo}`;

    return { systemPrompt, userPrompt };
};

/**
 * Parses and validates the raw string response from OpenAI into an array of ObjectiveRecommendations.
 */
const _parseAndValidateObjectiveRecommendations = (responseText: string | null | undefined): ObjectiveRecommendation[] => {
    if (!responseText) {
        logger.warn('[ObjectiveService] OpenAI response was empty.');
        return [];
    }
    try {
        const parsed = JSON.parse(responseText);
        if (!Array.isArray(parsed)) {
            logger.warn('[ObjectiveService] OpenAI response was not a JSON array:', parsed);
            return [];
        }
        const recommendations: ObjectiveRecommendation[] = [];
        for (const item of parsed) {
            if (item && typeof item.title === 'string' && typeof item.description === 'string') {
                // Determine difficulty, defaulting if missing or invalid
                const difficultyValue = ['Beginner', 'Intermediate', 'Advanced'].includes(item?.difficulty)
                    ? item.difficulty
                    : 'Intermediate';

                recommendations.push({
                    title: item.title,
                    description: item.description,
                    lessonType: Object.values(LessonType).includes(item.lessonType as LessonType) ? item.lessonType as LessonType : null,
                    targetDate: typeof item.targetDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(item.targetDate) ? item.targetDate : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    difficulty: difficultyValue as ('Beginner' | 'Intermediate' | 'Advanced') // Add difficulty
                });
            }
        }
        return recommendations;
    } catch (error) {
        logger.error('[ObjectiveService] Error parsing OpenAI response:', error);
        logger.error('[ObjectiveService] Raw OpenAI response:', responseText);
        return [];
    }
};

class ObjectiveService {
    // Use the shared prisma instance
    private readonly prisma = prisma;
    // Initialize OpenAI client as a private instance member
    private readonly openai = new OpenAI();

    /**
     * Fetches objectives for a specific student, optionally filtered by lesson type and status.
     * @param studentId The ID of the student.
     * @param lessonType Optional lesson type to filter by.
     * @param statuses Optional array of objective statuses to filter by.
     * @returns Promise resolving to an array of Objective shared models.
     */
    async getObjectivesByStudentId(
        studentId: string,
        lessonType?: LessonType,
        statuses?: ObjectiveStatusValue[]
    ): Promise<Objective[]> {
        type ObjectiveWithStatus = Prisma.ObjectiveGetPayload<{ include: typeof objectiveInclude }>;

        // Build the where clause dynamically
        const whereClause: Prisma.ObjectiveWhereInput = {
            studentId: studentId,
        };
        if (lessonType) {
            whereClause.lessonType = lessonType;
        }
        // Add status filtering if statuses array is provided and not empty
        if (statuses && statuses.length > 0) {
            whereClause.currentStatus = {
                status: {
                    in: statuses,
                },
            };
        }

        const prismaObjectives: ObjectiveWithStatus[] = await this.prisma.objective.findMany({
            where: whereClause, // Use dynamic where clause
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

        // --- Date Validation --- 
        const today = new Date();
        // Compare dates only, ignoring time part for simplicity
        today.setHours(0, 0, 0, 0);
        const targetDateOnly = new Date(targetDate);
        targetDateOnly.setHours(0, 0, 0, 0);

        if (targetDateOnly < today) {
            throw new BadRequestError('Target date cannot be in the past.');
        }
        // --- End Date Validation ---

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
            logger.error(`[ObjectiveService] Failed to retrieve currentStatus for newly created objective ${newObjectiveResult.id}`);
            throw new AppError('Created objective is missing status information.', 500);
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
            logger.error(`[ObjectiveService] Failed to retrieve currentStatus for updated objective ${objectiveId}`);
            throw new AppError('Updated objective is missing status information.', 500);
        }
        // Use module-scoped mapper
        return mapPrismaObjectiveToObjective(updatedObjective);
    }

    // === AI Objective Recommendation Methods ===

    /**
     * Prepares and returns the async generator for streaming objective recommendations,
     * utilizing the logAndYieldAiStream utility.
     */
    _generateObjectiveRecommendationsStream(
        studentId: string,
        lessonType: LessonType // Now required
    ): AsyncGenerator<ObjectiveRecommendation, void, unknown> {
        const logContext = `[Objective Stream S:${studentId} T:${lessonType}]`; // Include type in context
        logger.info(`${logContext} Preparing objective stream generator.`);

        // --- Prepare Prompts & Provider --- 
        const preparePromptsAndProvider = async () => {
            const student = await studentService.findById(studentId); // Use studentService
            if (!student) throw new NotFoundError(`Student with ID ${studentId} not found.`);

            // Fetch objectives ALREADY FILTERED by lessonType and relevant statuses
            const currentObjectivesFiltered = await this.getObjectivesByStudentId(
                studentId,
                lessonType, // Use the required lessonType
                [ObjectiveStatusValue.CREATED, ObjectiveStatusValue.IN_PROGRESS]
            );

            // Fetch past lessons FILTERED by lessonType and relevant statuses
            const pastLessonsFiltered = await lessonService.findLessonsByStudentId(studentId, lessonType, [
                LessonStatusValue.ACCEPTED,
                LessonStatusValue.COMPLETED
            ]);

            // Prepare prompts using the *required* lessonType and *filtered* data
            const { systemPrompt, userPrompt } = _prepareObjectivePrompts(
                student,
                lessonType,
                currentObjectivesFiltered,
                pastLessonsFiltered
            );

            const aiStreamProvider = () => {
                return this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    stream: true,
                    temperature: 0.7,
                    n: 1,
                });
            };
            return { systemPrompt, userPrompt, aiStreamProvider };
        };

        // --- Define Parsers/Validators --- 
        const chunkParser = (chunk: ChatCompletionChunk): string | null => {
            return chunk.choices[0]?.delta?.content ?? null;
        };

        const objectAssembler = (buffer: string): { parsedObject: ObjectiveRecommendation | null; remainingBuffer: string } => {
            let startIdx = buffer.indexOf('{');
            if (startIdx === -1) return { parsedObject: null, remainingBuffer: buffer };
            let braceDepth = 0;
            let endIdx = -1;
            for (let i = startIdx; i < buffer.length; i++) {
                if (buffer[i] === '{') braceDepth++;
                else if (buffer[i] === '}') braceDepth--;
                if (braceDepth === 0 && buffer[i] === '}') {
                    endIdx = i;
                    break;
                }
            }
            if (endIdx === -1) return { parsedObject: null, remainingBuffer: buffer };
            const jsonChunk = buffer.substring(startIdx, endIdx + 1);
            const remainingBuffer = buffer.substring(endIdx + 1);
            try {
                const potentialRec: any = JSON.parse(jsonChunk);

                // Explicitly determine difficulty 
                const difficultyValue = ['Beginner', 'Intermediate', 'Advanced'].includes(potentialRec?.difficulty)
                    ? potentialRec.difficulty
                    : 'Intermediate';

                const rec: ObjectiveRecommendation = {
                    title: String(potentialRec?.title ?? ''),
                    description: String(potentialRec?.description ?? ''),
                    lessonType: potentialRec?.lessonType === lessonType ? lessonType : null,
                    targetDate: typeof potentialRec?.targetDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(potentialRec.targetDate)
                        ? potentialRec.targetDate
                        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    difficulty: difficultyValue as ('Beginner' | 'Intermediate' | 'Advanced') // Cast the final value
                };
                return { parsedObject: rec, remainingBuffer };
            } catch (parseError) {
                return { parsedObject: null, remainingBuffer };
            }
        };

        const objectValidator = (obj: ObjectiveRecommendation): boolean => {
            // Validate required fields, including difficulty
            return !!(obj.title && obj.description && obj.targetDate && obj.difficulty);
        };

        // --- Return wrapped generator --- 
        async function* invokeUtility(): AsyncGenerator<ObjectiveRecommendation, void, unknown> {
            try {
                const { systemPrompt, userPrompt, aiStreamProvider } = await preparePromptsAndProvider();

                yield* logAndYieldAiStream<ObjectiveRecommendation>({
                    logContext,
                    systemPrompt,
                    userPrompt,
                    aiStreamProvider,
                    chunkParser,
                    objectAssembler,
                    objectValidator,
                    maxItems: DEFAULT_RECOMMENDATION_COUNT
                });
            } catch (prepError) {
                logger.error(`${logContext} Error preparing prompts for AI stream:`, prepError);
                throw new AppError('Failed to prepare AI prompts for recommendation streaming.', 500);
            }
        }
        return invokeUtility();
    }

    /**
     * Public method to initiate streaming objective recommendations.
     * LessonType is now required.
     */
    async streamObjectiveRecommendations(
        studentId: string,
        lessonType: LessonType, // Changed from LessonType | null
        res: Response
    ): Promise<void> {
        // Basic validation
        if (!studentId || !isUuid(studentId)) throw new BadRequestError('Valid Student ID is required.');
        // lessonType is now required, ensure it's valid
        if (!lessonType || !Object.values(LessonType).includes(lessonType)) throw new BadRequestError(`Valid Lesson Type is required.`);

        // Use the generator setup (lessonType is guaranteed to be non-null)
        const generator = () => this._generateObjectiveRecommendationsStream(studentId, lessonType);

        // Use the standard SSE utility
        await streamJsonResponse(res, generator, (error) => {
            logger.error(`[Objective Service] Error during objective recommendation streaming for student ${studentId}, type ${lessonType}:`, error);
            throw new AppError('Failed to generate objective recommendations.', 500);
        });
    }
}

// Export a singleton instance of the class
export const objectiveService = new ObjectiveService(); 