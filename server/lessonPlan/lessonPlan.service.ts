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
import { Response } from 'express'; // For streaming
import OpenAI from 'openai'; // Make sure OpenAI is imported
import { ChatCompletionChunk } from 'openai/resources/chat/completions'; // Import necessary type
import { logAndYieldAiStream } from '../utils/aiStream.utils.js'; // Import the AI stream utility

// Import services needed for context gathering
import { lessonService } from '../lesson/lesson.service.js';
import { studentService } from '../student/student.service.js';
import { objectiveService } from '../objective/objective.service.js';
import { ObjectiveStatusValue } from '../../shared/models/ObjectiveStatus.js';
import { LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { UserType as PrismaUserType } from '../../shared/models/UserType.js'; // Shared UserType
import { LessonType } from '../../shared/models/LessonType.js'; // Import LessonType if needed for validation

// Import shared models if not already imported via a central types/models file
import { AiGeneratedLessonPlan, AiMilestone, AiPlannedLesson, AiObjectiveForPlan } from '../../shared/models/AiGeneratedLessonPlan.js';

// Import streamJsonResponse if it's not automatically included
import { streamJsonResponse } from '../utils/sse.service.js';

// Define the includes needed for mapping
const lessonPlanIncludes = {
    currentStatus: true,
    statuses: true,
    milestones: true,
    lesson: { include: { quote: { include: { teacher: true, lessonRequest: { include: { student: true, address: true } } } } } }, // Ensure address is included if needed
    teacher: true
};

export class LessonPlanService {
    private prisma: PrismaClient;
    private readonly openai = new OpenAI(); // Initialize OpenAI client

    constructor(private readonly prismaInstance: PrismaClient = prismaClientInstance) {
        this.prisma = prismaInstance;
    }

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

    async generateAndStreamLessonPlanRecommendations(teacherId: string, sourceLessonId: string, res: Response): Promise<void> {
        const logContext = `[AI LessonPlan Stream T:${teacherId} L:${sourceLessonId}]`;
        console.log(`${logContext} Preparing stream generator.`);

        try {
            // --- Prepare Prompts & Provider --- 
            const { systemPrompt, userPrompt, aiStreamProvider } = await (async () => {
                // 1. Fetch Context Data 
                const teacherLessons = await lessonService.findLessons({ teacherId: teacherId });
                const sourceLesson = teacherLessons.find(lesson => lesson.id === sourceLessonId);
                if (!sourceLesson) throw new NotFoundError(`Source lesson with ID ${sourceLessonId} not found or not associated with teacher ${teacherId}.`);
                const student = sourceLesson.getStudent();
                if (!student) throw new NotFoundError(`Student not found for source lesson ${sourceLessonId}.`);
                const studentName = `${student.firstName} ${student.lastName}`.trim() || 'The Student';
                const lessonType = sourceLesson.getLessonType();
                const lessonStartTime = sourceLesson.getStartTime().toISOString();
                const lessonDuration = sourceLesson.quote.lessonRequest.durationMinutes;
                const relevantObjectiveStatuses = [ObjectiveStatusValue.CREATED, ObjectiveStatusValue.IN_PROGRESS];
                const studentObjectives = await objectiveService.getObjectivesByStudentId(student.id, lessonType, relevantObjectiveStatuses);
                const objectivesSummary = studentObjectives.length > 0 ? studentObjectives.map(obj => `- ${obj.title} (Status: ${obj.currentStatus.status})`).join('\n') : 'None';
                const relevantPastLessonStatuses = [LessonStatusValue.COMPLETED, LessonStatusValue.ACCEPTED];
                const pastLessons = await lessonService.findLessonsByStudentId(student.id, lessonType, relevantPastLessonStatuses);
                const pastLessonsSummary = pastLessons.length > 0 ? pastLessons.map(l => `- Date: ${l.getStartTime().toISOString().split('T')[0]}, Status: ${l.currentStatus?.status ?? 'N/A'}`).join('\n') : '0 relevant past lessons found.';

                // 2. Prepare Prompts 
                const systemPrompt = `You are a helpful assistant that helps teachers come up with an objective, milestones and lessons for one-on-one lessons. Based on the student info, current lesson details, past lesson history, and the student's relevant learning objectives, suggest an overall objective, milestones and lessons to help the student achieve their objective. Come up with 3 options.\n\nGenerate ONLY the JSON array as your response. Each element of the array should be an object. This object should have two top-level keys: "objective" and "milestones".\n\nThe "objective" key should correspond to an object with "title", "description", and "dueDate" (YYYY-MM-DD format).\n\nThe "milestones" key should correspond to an array of milestone objects. Each milestone object should have "title", "description", "dueDate" (YYYY-MM-DD format), and a "lessons" array.\n\nEach lesson in the "lessons" array (within a milestone) should have "startTime" (as "YYYY-MM-DD HH:MM") and "durationMinutes" (as an integer representing minutes).`;
                const userPrompt = `Student: ${studentName}.\nLesson Type: ${lessonType}.\nSource Lesson Start Time: ${lessonStartTime}.\nSource Lesson Duration: ${lessonDuration} minutes.\n\nStudent's Relevant Objectives for ${lessonType} (${studentObjectives.length}):\n${objectivesSummary}\n\nPast ${lessonType} Lessons Summary (${pastLessons.length}):\n${pastLessonsSummary}\n\nGenerate 3 lesson plan options. Remember to suggest future dates for objectives and milestones.`;

                console.log(`${logContext} --- SYSTEM PROMPT ---`);
                console.log(systemPrompt);
                console.log(`${logContext} --- USER PROMPT ---`);
                console.log(userPrompt);
                console.log(`${logContext} --------------------`);

                // 3. Define AI Stream Provider
                const aiStreamProvider = () => {
                    return this.openai.chat.completions.create({
                        model: "gpt-3.5-turbo", // Or "gpt-4" etc.
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
            })(); // Immediately invoke the async IIFE

            // --- Define Parsers/Validators --- 
            const chunkParser = (chunk: ChatCompletionChunk): string | null => {
                return chunk.choices[0]?.delta?.content ?? null;
            };

            const objectAssembler = (buffer: string): { parsedObject: AiGeneratedLessonPlan | null; remainingBuffer: string } => {
                let searchBuffer = buffer.trimStart();

                // Skip leading array characters like '[' or ','
                if (searchBuffer.startsWith('[') || searchBuffer.startsWith(',')) {
                    searchBuffer = searchBuffer.substring(1).trimStart();
                }

                let startIdx = searchBuffer.indexOf('{'); // Look for the start of an object

                if (startIdx === -1) {
                    // If no '{' is found after trimming array chars, check if it's the end of an array
                    if (searchBuffer.startsWith(']')) {
                        return { parsedObject: null, remainingBuffer: searchBuffer.substring(1).trimStart() };
                    }
                    // Otherwise, no object found in the current buffer segment
                    return { parsedObject: null, remainingBuffer: buffer };
                }

                // Adjust startIdx to be relative to the original buffer if we trimmed/skipped
                const actualStartIdxInOriginalBuffer = buffer.length - searchBuffer.length + startIdx;

                let braceDepth = 0;
                let endIdxInSearchBuffer = -1;
                for (let i = startIdx; i < searchBuffer.length; i++) {
                    if (searchBuffer[i] === '{') braceDepth++;
                    else if (searchBuffer[i] === '}') braceDepth--;

                    if (braceDepth === 0 && i >= startIdx) {
                        endIdxInSearchBuffer = i;
                        break;
                    }
                }

                if (endIdxInSearchBuffer === -1) {
                    // Object not complete yet in the current buffer
                    return { parsedObject: null, remainingBuffer: buffer };
                }

                const jsonChunk = searchBuffer.substring(startIdx, endIdxInSearchBuffer + 1);
                // Calculate remainingBuffer based on the original buffer and the actual consumed part
                const consumedLengthInOriginalBuffer = actualStartIdxInOriginalBuffer + jsonChunk.length - (buffer.length - searchBuffer.length);
                const actualRemainingBuffer = buffer.substring(buffer.length - searchBuffer.length + jsonChunk.length);


                try {
                    const potentialPlan: any = JSON.parse(jsonChunk);

                    if (potentialPlan && potentialPlan.objective && Array.isArray(potentialPlan.milestones)) {
                        // Normalize durationMinutes, accessing potentialPlan.milestones
                        potentialPlan.milestones.forEach((m: any) => { // 'm' will be AiMilestone if valid
                            if (m.lessons && Array.isArray(m.lessons)) {
                                m.lessons.forEach((l: any) => { // 'l' will be AiPlannedLesson if valid
                                    const parsedDuration = parseInt(String(l.durationMinutes), 10);
                                    l.durationMinutes = Number.isFinite(parsedDuration) ? parsedDuration : 60;
                                });
                            }
                        });
                        return { parsedObject: potentialPlan as AiGeneratedLessonPlan, remainingBuffer: actualRemainingBuffer };
                    } else {
                        console.warn(`${logContext} Discarding object due to failed structural validation: ${jsonChunk}`);
                        return { parsedObject: null, remainingBuffer: actualRemainingBuffer };
                    }
                } catch (parseError) {
                    console.warn(`${logContext} JSON parse error for chunk. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}. Chunk: ${jsonChunk}`);
                    return { parsedObject: null, remainingBuffer: actualRemainingBuffer };
                }
            };

            const objectValidator = (obj: AiGeneratedLessonPlan): boolean => {
                const isValid = !!(
                    obj.objective?.title &&
                    obj.objective?.description &&
                    obj.objective?.dueDate &&
                    Array.isArray(obj.milestones) && // REVERTED: obj.milestones
                    obj.milestones.every((m: AiMilestone) => m.title && m.description && m.dueDate && Array.isArray(m.lessons)) && // REVERTED & TYPED
                    obj.milestones.every((m: AiMilestone) => m.lessons.every((l: AiPlannedLesson) => l.startTime && typeof l.durationMinutes === 'number')) // REVERTED & TYPED
                );
                if (!isValid) {
                    console.warn(`${logContext} Validation failed for assembled object:`, JSON.stringify(obj, null, 2));
                }
                return isValid;
            };

            // --- Use logAndYieldAiStream Utility --- 
            // const streamGenerator = logAndYieldAiStream<AiGeneratedLessonPlan>({ // Commenting out the original
            //     logContext,
            //     systemPrompt,
            //     userPrompt,
            //     aiStreamProvider,
            //     chunkParser,
            //     objectAssembler,
            //     objectValidator,
            //     maxItems: 3
            // });

            // --- Stream Response using streamJsonResponse --- 
            await streamJsonResponse(res, () => logAndYieldAiStream<AiGeneratedLessonPlan>({
                logContext,
                systemPrompt,
                userPrompt,
                aiStreamProvider,
                chunkParser,
                objectAssembler,
                objectValidator,
                maxItems: 3
            }), (error) => {
                console.error(`${logContext} Error during AI recommendation streaming:`, error);
            });

        } catch (error) {
            console.error(`${logContext} Failed to generate or stream recommendations:`, error);
            if (!res.headersSent) {
                if (error instanceof NotFoundError) res.status(404).json({ error: error.message });
                else if (error instanceof BadRequestError) res.status(400).json({ error: error.message });
                else res.status(500).json({ error: 'Failed to generate lesson plan recommendations.' });
            } else {
                res.end();
            }
        }
    }
}

// Export singleton instance
export const lessonPlanService = new LessonPlanService(prismaClientInstance); 