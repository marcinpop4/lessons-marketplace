import { Prisma } from '@prisma/client';
import { Goal, DbGoalWithStatus } from '../../shared/models/Goal.js';
import { GoalStatus, GoalStatusTransition, GoalStatusValue } from '../../shared/models/GoalStatus.js';
import { Lesson, DbLessonWithNestedRelations } from '../../shared/models/Lesson.js';
import { randomUUID } from 'crypto';
// import { AppError } from '../utils/AppError.js'; // Old import
import { NotFoundError, BadRequestError, AuthorizationError } from '../errors/index.js';
import OpenAI from 'openai';
import { studentService } from '../student/student.service.js';
import { lessonService } from '../lesson/lesson.service.js';
import { teacherService } from '../teacher/teacher.service.js';
import prisma from '../prisma.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { GoalRecommendation } from '../../shared/models/GoalRecommendation.js';
import { Response, Request } from 'express';
import { GoalMapper } from './goal.mapper.js';
import { isUuid } from '../utils/validation.utils.js';
import { streamJsonResponse } from '../utils/sse.service.js'; // Import the SSE utility
import { logAndYieldAiStream } from '../utils/aiStream.utils.js'; // Import the new utility
import { ChatCompletionChunk } from 'openai/resources/chat/completions';

// --- Configuration Constants ---
// LOG_STREAMING_DETAILS is now handled within aiStream.utils.ts
// const LOG_STREAMING_DETAILS = true; // Hardcoded to true 
const DEFAULT_GOAL_RECOMMENDATION_COUNT = 6;

// Remove unused Prisma payload type definition
// type LessonWithGoals = Prisma.LessonGetPayload<{ ... }>;

// Remove unused API response interfaces
// interface LessonResponse { ... }
// interface StudentResponse { ... }

// OpenAI client initialization (ensure API key is set in env)
const openai = new OpenAI();

/**
 * Service layer for handling Goal-related operations.
 */
export const goalService = {
    /**
     * Creates a new Goal for a given Lesson.
     * Requires the requesting user to be the Teacher of the lesson.
     */
    async createGoal(
        requestingUserId: string, // Added: ID of the user making the request
        lessonId: string,
        title: string,
        description: string,
        estimatedLessonCount: number
    ): Promise<Goal> {
        // --- Validation --- 
        if (!requestingUserId) {
            // This should ideally be caught by auth middleware, but good to double-check
            throw new BadRequestError('Requesting User ID is required.');
        }
        if (!lessonId || !isUuid(lessonId)) {
            throw new BadRequestError('Valid Lesson ID is required.');
        }
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            throw new BadRequestError('Title is required and must be a non-empty string.');
        }
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            throw new BadRequestError('Description is required and must be a non-empty string.');
        }
        if (typeof estimatedLessonCount !== 'number' || !Number.isInteger(estimatedLessonCount) || estimatedLessonCount <= 0) {
            throw new BadRequestError('Estimated Lesson Count must be a positive integer.');
        }
        // --- End Validation ---

        // Check if the lesson exists and get teacher ID for authorization
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { id: true, quote: { select: { teacherId: true } } }
        });

        if (!lesson) {
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
        }

        // Authorization Check: Ensure requesting user is the teacher
        if (lesson.quote?.teacherId !== requestingUserId) {
            throw new AuthorizationError('User is not authorized to create goals for this lesson.');
        }

        const goalId = randomUUID();
        const initialStatusId = randomUUID();
        const initialStatusValue = GoalStatusValue.CREATED;

        await prisma.$transaction(async (tx) => {
            const newGoal = await tx.goal.create({
                data: {
                    id: goalId,
                    lessonId: lessonId,
                    title: title,
                    description: description,
                    estimatedLessonCount: estimatedLessonCount,
                },
            });
            const newStatusRecord = await tx.goalStatus.create({
                data: {
                    id: initialStatusId,
                    goalId: newGoal.id,
                    status: initialStatusValue,
                },
            });
            // Update only, don't fetch relations here
            await tx.goal.update({
                where: { id: newGoal.id },
                data: { currentStatusId: newStatusRecord.id },
            });
        });

        // Fetch the complete goal with status AFTER the transaction
        const createdGoalWithStatus = await prisma.goal.findUniqueOrThrow({
            where: { id: goalId },
            include: { currentStatus: true },
        });

        // Use the factory method on the fetched data
        const goalModel = GoalMapper.toModel(createdGoalWithStatus as DbGoalWithStatus);

        return goalModel;
    },

    /**
     * Updates the status of an existing Goal.
     * Requires the requesting user to be the Teacher of the lesson associated with the goal.
     */
    async updateGoalStatus(
        requestingUserId: string,
        goalId: string,
        // Make transition potentially undefined to handle missing case
        transition: GoalStatusTransition | undefined,
        context: Prisma.JsonValue | null = null
    ): Promise<Goal> {
        // --- Validation --- 
        if (!requestingUserId) {
            throw new BadRequestError('Requesting User ID is required.');
        }
        if (!goalId || !isUuid(goalId)) {
            throw new BadRequestError('Valid Goal ID is required.');
        }
        // Validate the transition input itself
        if (!transition || !Object.values(GoalStatusTransition).includes(transition)) {
            throw new BadRequestError('Invalid or missing transition value provided.');
        }
        // Context validation (basic type check, more specific if needed)
        if (context !== null && typeof context !== 'object') {
            throw new BadRequestError('Invalid context format. Must be a JSON object or null.');
        }
        // --- End Validation ---

        // Fetch the goal, including lesson teacher ID for authorization check
        const goalData = await prisma.goal.findUnique({
            where: { id: goalId },
            select: {
                id: true,
                lesson: {
                    select: {
                        quote: {
                            select: { teacherId: true }
                        }
                    }
                }
            }
        });

        if (!goalData) {
            throw new NotFoundError(`Goal with ID ${goalId} not found.`);
        }

        // Authorization Check: Ensure requesting user is the teacher
        if (goalData.lesson.quote?.teacherId !== requestingUserId) {
            throw new AuthorizationError('User is not authorized to update the status of this goal.');
        }

        await prisma.$transaction(async (tx) => {
            const currentGoal = await tx.goal.findUniqueOrThrow({ where: { id: goalId } });

            // Explicitly check if currentStatusId is null
            if (!currentGoal.currentStatusId) {
                throw new BadRequestError(`Goal with ID ${goalId} has a null currentStatusId, cannot update status.`);
            }

            // Access model via tx.goalStatus
            const currentStatusRecord = await tx.goalStatus.findUniqueOrThrow({
                where: { id: currentGoal.currentStatusId }, // Now guaranteed not null
            });
            const currentStatusValue = currentStatusRecord.status as GoalStatusValue;
            // Store potentially undefined value first
            const maybeNewStatusValue = GoalStatus.getResultingStatus(currentStatusValue, transition);
            if (!maybeNewStatusValue) { // Check if undefined
                throw new BadRequestError(`Invalid status transition '${transition}' for current status '${currentStatusValue}'.`);
            }
            // Assign the validated status value
            const newStatusValue = maybeNewStatusValue;

            const newStatusId = randomUUID();
            // Access model via tx.goalStatus
            const newStatusRecord = await tx.goalStatus.create({
                data: {
                    id: newStatusId,
                    goalId: goalId,
                    status: newStatusValue,
                    // Cast context to satisfy Prisma's InputJsonValue requirement
                    context: context as Prisma.InputJsonValue,
                },
            });
            // Update only, don't fetch relations here
            await tx.goal.update({
                where: { id: goalId },
                data: { currentStatusId: newStatusRecord.id },
            });
        });

        // Fetch the complete goal with status AFTER the transaction
        const updatedGoalWithStatus = await prisma.goal.findUniqueOrThrow({
            where: { id: goalId },
            include: { currentStatus: true },
        });

        // Use the factory method on the fetched data
        const goalModel = GoalMapper.toModel(updatedGoalWithStatus as DbGoalWithStatus);

        return goalModel;
    },

    /**
     * Retrieves a Goal by its ID, ensuring the requesting user is authorized.
     * @param goalId The ID of the goal to retrieve.
     * @param userId The ID of the user making the request.
     * @returns A promise resolving to the Goal model or null if not found.
     * @throws {NotFoundError} If the goal is not found.
     * @throws {AuthorizationError} If the user is not authorized to view the goal.
     */
    async getGoalById(goalId: string, userId: string): Promise<Goal | null> {
        // --- Validation ---
        if (!goalId || !isUuid(goalId)) {
            throw new BadRequestError('Valid Goal ID is required.');
        }
        if (!userId) {
            // Should be caught by authMiddleware, but defensive check
            throw new BadRequestError('User ID is required for authorization.');
        }
        // --- End Validation ---

        const goalData = await prisma.goal.findUnique({
            where: { id: goalId },
            include: {
                currentStatus: true, // Ensure status is included
                lesson: { // Include lesson details for authorization
                    select: {
                        id: true,
                        quote: {
                            select: {
                                teacherId: true,
                                lessonRequest: {
                                    select: {
                                        studentId: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!goalData) {
            // Maintain consistency, throw NotFoundError instead of returning null
            throw new NotFoundError(`Goal with ID ${goalId} not found.`);
        }

        // Authorization check
        const studentId = goalData.lesson.quote?.lessonRequest?.studentId;
        const teacherId = goalData.lesson.quote?.teacherId;

        if (userId !== studentId && userId !== teacherId) {
            throw new AuthorizationError('User is not authorized to view this goal.');
        }

        // Use the factory method
        return GoalMapper.toModel(goalData as DbGoalWithStatus);
    },

    /**
     * Retrieves all Goals for a specific Lesson, checking authorization.
     * @param lessonId The ID of the lesson.
     * @param userId The ID of the user requesting the goals.
     * @returns A promise resolving to an array of Goal models.
     * @throws {NotFoundError} If the lesson is not found.
     * @throws {AuthorizationError} If the user is not the student or teacher for the lesson.
     * @throws {BadRequestError} If lessonId or userId is missing.
     */
    async getGoalsByLessonId(lessonId: string, userId: string): Promise<Goal[]> {
        // --- Validation ---
        if (!lessonId || !isUuid(lessonId)) {
            throw new BadRequestError('Valid Lesson ID is required.');
        }
        if (!userId) {
            // Should be caught by authMiddleware, but defensive check
            throw new BadRequestError('User ID is required for authorization.');
        }
        // --- End Validation ---

        // Fetch the lesson and include related IDs needed for authorization
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                quote: {
                    select: {
                        teacherId: true,
                        lessonRequest: {
                            select: {
                                studentId: true
                            }
                        }
                    }
                }
            }
        });

        if (!lesson) {
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
        }

        // Authorization check
        const studentId = lesson.quote?.lessonRequest?.studentId;
        const teacherId = lesson.quote?.teacherId;

        if (userId !== studentId && userId !== teacherId) {
            throw new AuthorizationError('User is not authorized to view goals for this lesson.');
        }

        // Fetch goals if authorized
        const goalsData = await prisma.goal.findMany({
            where: { lessonId: lessonId },
            orderBy: { createdAt: 'asc' },
            include: {
                currentStatus: true // Ensure status is included
            }
        });

        // Use the mapper
        return goalsData.map(goalData => GoalMapper.toModel(goalData as DbGoalWithStatus));
    },

    /**
     * Counts the number of Goals for a specific Lesson.
     * @param lessonId The ID of the lesson.
     * @returns The number of goals associated with the lesson.
     */
    async getGoalCountByLessonId(lessonId: string): Promise<number> {
        try {
            const count = await prisma.goal.count({
                where: { lessonId: lessonId },
            });
            return count;
        } catch (error) {
            console.error(`Error counting goals for lesson ${lessonId}:`, error);
            // Consider specific error handling or re-throwing
            throw new Error(`Failed to count goals: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    // === Private Helper Methods ===

    /** Fetches the necessary context (lesson, student, goals) for generating recommendations. */
    async _getRecommendationContext(lessonId: string, userId: string) {
        // --- Validation (moved from generate/stream methods) ---
        if (!lessonId || !isUuid(lessonId)) {
            throw new BadRequestError('Valid Lesson ID is required.');
        }
        if (!userId) {
            throw new BadRequestError('User ID is required for authorization.');
        }
        // --- End Validation ---

        const currentLesson = await lessonService.getLessonById(lessonId, userId);
        if (!currentLesson) throw new NotFoundError(`Lesson ${lessonId} not found or user ${userId} not authorized.`);

        const studentId = currentLesson.quote.lessonRequest.student.id;
        const teacherId = currentLesson.quote.teacher.id;
        const student = await studentService.findById(studentId);
        if (!student) throw new NotFoundError(`Student ${studentId} not found`);

        const allTeacherLessons: Lesson[] = [];

        const pastLessons = allTeacherLessons
            .filter((l: Lesson) => l.quote.lessonRequest.student.id === studentId && l.id !== lessonId)
            .sort((a: Lesson, b: Lesson) => new Date(b.quote.lessonRequest.startTime).getTime() - new Date(a.quote.lessonRequest.startTime).getTime());
        const currentLessonGoals = await this.getGoalsByLessonId(lessonId, userId);

        return { student, currentLesson, pastLessons, currentLessonGoals };
    },

    /** Prepares the system and user prompts for the OpenAI API call. */
    _prepareOpenAiPrompts(context: Awaited<ReturnType<typeof this._getRecommendationContext>>): { systemPrompt: string, userPrompt: string } {
        const { student, currentLesson, pastLessons, currentLessonGoals } = context;

        const systemPrompt = `You are a helpful assistant that helps teachers come up with goals for one-on-one lessons. Based on the student info, current lesson details (including its existing goals), and past lesson history, suggest ${DEFAULT_GOAL_RECOMMENDATION_COUNT} new potential goals. Each goal should have a title, description, estimatedLessonCount (integer), and difficulty (Beginner, Intermediate, Advanced). Respond ONLY with a valid JSON array of these goal objects, like this: [{ "title": "Goal 1", "description": "Desc 1", "estimatedLessonCount": 3, "difficulty": "Beginner" }, { ... }]`;

        const studentInfo = `Student: ${student.firstName} ${student.lastName}.`; // Add more details if available/needed
        const lessonInfo = `Current Lesson Type: ${currentLesson.quote.lessonRequest.type}. Target Time: ${currentLesson.quote.lessonRequest.startTime.toISOString()}.`;
        const currentGoalsInfo = `Current Goals for this Lesson (${currentLessonGoals.length}):\n${currentLessonGoals.map(g => `- ${g.title} (Status: ${g.currentStatus.status}, Est: ${g.estimatedLessonCount} lessons)`).join('\n') || 'None'}`;
        // TODO: Add past lesson/goal summary if needed and available
        const pastLessonsInfo = `Past Lessons Summary: ${pastLessons.length} relevant past lessons found.`;

        const userPrompt = `Please generate ${DEFAULT_GOAL_RECOMMENDATION_COUNT} goals for the student based on this context:\n${studentInfo}\n${lessonInfo}\n${currentGoalsInfo}\n${pastLessonsInfo}\n\nGenerate ONLY the JSON array.`;

        return { systemPrompt, userPrompt };
    },

    /** Parses the raw OpenAI response string, validates, and returns GoalRecommendation instances. */
    _parseAndValidateRecommendations(responseText: string | null | undefined): GoalRecommendation[] {
        if (!responseText) {
            throw new Error('No response content received from OpenAI.');
        }
        try {
            const parsedResponse = JSON.parse(responseText);
            if (!Array.isArray(parsedResponse)) {
                console.error('OpenAI response is not an array:', parsedResponse);
                throw new Error('Invalid format for goal recommendations from OpenAI: expected an array.');
            }

            const recommendations = parsedResponse.map(item => {
                try {
                    return new GoalRecommendation(item);
                } catch (validationError) {
                    console.error('Failed to instantiate GoalRecommendation from item:', item, validationError);
                    return null; // Skip invalid items
                }
            });

            // Filter out any nulls
            const validRecommendations = recommendations.filter((rec): rec is GoalRecommendation => rec !== null);
            return validRecommendations;

        } catch (parseError) {
            console.error('Error parsing OpenAI JSON response:', parseError);
            console.error('Raw OpenAI response was:', responseText);
            throw new Error('Failed to parse goal recommendations from OpenAI response');
        }
    },

    /**
     * Generates goal recommendations (non-streaming version).
     * Uses the shared helper methods.
     */
    async generateGoalRecommendations(
        lessonId: string,
        userId: string
    ): Promise<GoalRecommendation[]> {
        const context = await this._getRecommendationContext(lessonId, userId);
        const { systemPrompt, userPrompt } = this._prepareOpenAiPrompts(context);

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.7,
            });

            const responseText = completion.choices[0]?.message?.content;
            return this._parseAndValidateRecommendations(responseText);

        } catch (error: any) {
            console.error('Error generating goal recommendations from OpenAI:', error);
            throw new Error(`AI recommendation generation failed: ${error.message}`);
        }
    },

    /**
     * Async generator function that prepares and utilizes the AI stream logging utility.
     *
     * @param lessonId - ID of the lesson.
     * @param userId - ID of the requesting user.
     * @returns AsyncGenerator yielding GoalRecommendation objects.
     */
    _generateGoalRecommendationsStream(
        lessonId: string,
        userId: string
    ): AsyncGenerator<GoalRecommendation, void, unknown> {
        const logContext = `[Goal Stream L:${lessonId}]`;
        console.log(`${logContext} Preparing stream generator.`);

        // --- Prepare Prompts First --- 
        // We need to get context and prepare prompts *before* calling the utility,
        // so the utility can log them.
        // This involves calling _getRecommendationContext and _prepareOpenAiPrompts here.
        // Wrap in a function to handle potential async errors during prep.
        const preparePromptsAndProvider = async () => {
            const context = await this._getRecommendationContext(lessonId, userId);
            const { systemPrompt, userPrompt } = this._prepareOpenAiPrompts(context);

            // Define the provider function *after* prompts are ready
            const aiStreamProvider = () => {
                return openai.chat.completions.create({
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

        // --- Define Parsers/Validators (remain the same) ---
        const chunkParser = (chunk: ChatCompletionChunk): string | null => {
            return chunk.choices[0]?.delta?.content ?? null;
        };

        const objectAssembler = (buffer: string): { parsedObject: GoalRecommendation | null; remainingBuffer: string } => {
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
                const potentialRecommendation = JSON.parse(jsonChunk);
                return { parsedObject: potentialRecommendation, remainingBuffer };
            } catch (parseError) {
                // Logging is handled by the aiStream utility now.
                // If parsing fails here, the chunk is considered unparseable and discarded.
                // if (LOG_STREAMING_DETAILS) {
                //     if (jsonChunk.length > 2) {
                //         console.warn(`\n${logContext} Discarding unparseable JSON object chunk: ${jsonChunk}, Error: ${parseError instanceof Error ? parseError.message : parseError}`);
                //     }
                // }
                return { parsedObject: null, remainingBuffer };
            }
        };

        const objectValidator = (obj: GoalRecommendation): boolean => {
            return !!(obj.title && obj.description && obj.estimatedLessonCount);
        };

        // --- Return the result of calling the utility --- 
        // Need to wrap the call in an async generator function to handle the async prompt preparation
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this; // Preserve 'this' context if needed inside generator
        async function* invokeUtility(): AsyncGenerator<GoalRecommendation, void, unknown> {
            try {
                const { systemPrompt, userPrompt, aiStreamProvider } = await preparePromptsAndProvider();

                // Now call the utility with the actual prompts
                yield* logAndYieldAiStream<GoalRecommendation>({
                    logContext,
                    systemPrompt, // Pass the actual prepared prompt
                    userPrompt,   // Pass the actual prepared prompt
                    aiStreamProvider, // Pass the function that returns the stream
                    chunkParser,
                    objectAssembler,
                    objectValidator,
                    maxItems: DEFAULT_GOAL_RECOMMENDATION_COUNT
                });
            } catch (prepError) {
                // Handle errors during prompt preparation (e.g., context fetching)
                console.error(`${logContext} Error preparing prompts for AI stream:`, prepError);
                // Re-throw to be caught by streamJsonResponse and sent as SSE error
                throw prepError;
            }
        }

        return invokeUtility();
    },

    /**
     * Public method to initiate streaming goal recommendations.
     * Uses the generic streamJsonResponse utility with the wrapped generator.
     *
     * @param lessonId - ID of the lesson.
     * @param res - Express Response object.
     * @param userId - ID of the requesting user.
     */
    async streamGoalRecommendations(
        lessonId: string,
        res: Response,
        userId: string
    ): Promise<void> {
        // Basic input validation (more detailed validation happens in _getRecommendationContext)
        if (!lessonId || !isUuid(lessonId)) {
            throw new BadRequestError('Valid Lesson ID is required.');
        }
        if (!userId) {
            throw new BadRequestError('User ID is required for authorization.');
        }

        // Define the generator function using the new wrapper setup
        const generator = () => this._generateGoalRecommendationsStream(lessonId, userId);

        // Use the standard SSE utility
        await streamJsonResponse(res, generator, (error) => {
            console.error(`[Goal Service] Error during goal recommendation streaming for lesson ${lessonId}:`, error);
        });
    },
}; 