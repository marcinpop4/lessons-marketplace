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

// --- Configuration Constants ---
const LOG_STREAMING_DETAILS = process.env.LOG_STREAMING_DETAILS === 'true' || false; // Default to false

// Remove unused Prisma payload type definition
// type LessonWithGoals = Prisma.LessonGetPayload<{ ... }>;

// Remove unused API response interfaces
// interface LessonResponse { ... }
// interface StudentResponse { ... }

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
        // Validate the transition input itself
        if (!transition || !Object.values(GoalStatusTransition).includes(transition)) {
            throw new BadRequestError('Invalid or missing transition value provided.');
        }

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
        if (!goalId) {
            throw new BadRequestError('Goal ID is required.');
        }
        if (!userId) {
            throw new BadRequestError('User ID is required for authorization.');
        }

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
        if (!lessonId) {
            throw new BadRequestError('Lesson ID is required.');
        }
        if (!userId) {
            // Should be caught by authMiddleware, but defensive check
            throw new BadRequestError('User ID is required for authorization.');
        }

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
    _prepareOpenAiPrompts(context: Awaited<ReturnType<typeof this._getRecommendationContext>>, count: number) {
        const { student, currentLesson, pastLessons, currentLessonGoals } = context;

        // Construct the leaner promptData object with only specified fields
        const promptData = {
            student: {
                firstName: student.firstName,
                lastName: student.lastName,
                dateOfBirth: student.dateOfBirth?.toISOString().split('T')[0] // Format as YYYY-MM-DD
            },
            currentLesson: {
                type: currentLesson.quote.lessonRequest.type,
                durationMinutes: currentLesson.quote.lessonRequest.durationMinutes,
                startTime: currentLesson.quote.lessonRequest.startTime.toISOString(),
                status: currentLesson.currentStatus?.status || 'UNKNOWN',
                goals: currentLessonGoals.map(g => ({
                    title: g.title,
                    description: g.description, // Keep description for context
                    status: g.currentStatus.status
                }))
            },
            pastLessons: pastLessons.map((l: Lesson) => ({
                type: l.quote.lessonRequest.type,
                durationMinutes: l.quote.lessonRequest.durationMinutes,
                status: l.currentStatus?.status ?? 'UNKNOWN', // Handle potential null status
                startTime: l.quote.lessonRequest.startTime.toISOString()
            }))
        };

        const systemPrompt = {
            role: "system",
            content: `You are a helpful assistant that helps teachers come up with goals \
for one-on-one lessons. Based on the student info, current lesson details \
(including its existing goals), and past lesson history, suggest ${count} new potential goals. \
Each goal should have a title, description, and estimated number of lessons to achieve it. \
Classify the goals by difficulty level: "beginner", "intermediate", "advanced". \
Format your response as a JSON array of objects with the structure: \
{ goal: { title: string, description: string, estimatedLessonCount: number, difficultyLevel: string } } \
Ensure that each object strictly follows the specified format, and do not include any additional explanation or commentary outside of the JSON array.`
        } as const;

        // Stringify the prompt data with indentation for readability in the code block
        const jsonDataString = JSON.stringify(promptData, null, 2);

        // Construct the user message content with preamble and Markdown code block using concatenation
        const userMessageContent = "Here is the relevant information in JSON format:\n"
            + "```json\n"
            + jsonDataString + "\n"
            + "```";

        const userMessage = {
            role: "user",
            content: userMessageContent
        } as const;

        return { systemPrompt, userMessage };
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
     * Generates AI-powered goal recommendations for a lesson, ensuring the requesting user is the teacher.
     * @param lessonId The ID of the lesson.
     * @param userId The ID of the user making the request (must be the teacher).
     * @returns A promise resolving to an array of GoalRecommendation objects.
     * @throws {NotFoundError} If the lesson is not found.
     * @throws {AuthorizationError} If the requesting user is not the teacher of the lesson.
     */
    async generateGoalRecommendations(
        lessonId: string,
        userId: string
    ): Promise<GoalRecommendation[]> {
        if (!lessonId) {
            throw new BadRequestError('Lesson ID is required.');
        }
        if (!userId) {
            throw new BadRequestError('User ID is required for authorization.');
        }

        // Fetch lesson to verify teacher
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                quote: {
                    select: {
                        teacherId: true,
                    }
                }
            }
        });

        if (!lesson) {
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
        }

        // Authorization check: Only the teacher can generate recommendations
        if (lesson.quote?.teacherId !== userId) {
            throw new AuthorizationError('Only the teacher can generate recommendations for this lesson.');
        }

        // Proceed with recommendation generation
        const context = await this._getRecommendationContext(lessonId, userId);
        const count = 5; // Default count for non-streaming version
        const { systemPrompt, userMessage } = this._prepareOpenAiPrompts(context, count);

        try {
            const openai = new OpenAI();
            const chatCompletion = await openai.chat.completions.create({
                messages: [systemPrompt, userMessage],
                model: "gpt-4-turbo",
                temperature: 0.7,
            });

            const responseText = chatCompletion.choices[0]?.message?.content;
            return this._parseAndValidateRecommendations(responseText);

        } catch (error) {
            console.error("Error generating recommendations from OpenAI:", error);
            throw new Error("Failed to generate goal recommendations.");
        }
    },

    /**
     * Streams AI-powered goal recommendations for a lesson, ensuring the requesting user is the teacher.
     * @param lessonId The ID of the lesson.
     * @param count The number of recommendations to stream.
     * @param req The Express Request object for handling client disconnection.
     * @param res The Express Response object to stream to.
     * @param userId The ID of the user making the request (must be the teacher).
     * @throws {NotFoundError} If the lesson is not found.
     * @throws {AuthorizationError} If the requesting user is not the teacher of the lesson.
     */
    async streamGoalRecommendations(
        lessonId: string,
        count: number,
        req: Request,
        res: Response,
        userId: string
    ): Promise<void> {
        console.log(`[SSE Service] Starting stream for lesson ${lessonId}, count ${count}, user ${userId}`);

        if (!lessonId) {
            throw new BadRequestError('Lesson ID is required.');
        }
        if (!userId) {
            throw new BadRequestError('User ID is required for authorization.');
        }
        if (!req) {
            throw new Error("Request object is required for streaming.");
        }
        if (!res) {
            throw new Error("Response object is required for streaming.");
        }

        // Fetch lesson to verify teacher
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: {
                id: true,
                quote: {
                    select: {
                        teacherId: true,
                    }
                }
            }
        });

        if (!lesson) {
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
        }

        // Authorization check: Only the teacher can stream recommendations
        if (lesson.quote?.teacherId !== userId) {
            throw new AuthorizationError('Only the teacher can stream recommendations for this lesson.');
        }

        // Use a flag to track if the stream has ended to prevent multiple res.end() calls
        let streamEnded = false;

        // Function to safely end the stream
        const safeEndStream = (event?: string, data?: any) => {
            if (!streamEnded) {
                streamEnded = true;
                if (event && data) {
                    const jsonData = JSON.stringify(data);
                    console.log(`[SSE Service] Sending final event: ${event}, Data: ${jsonData}`);
                    res.write(`event: ${event}\ndata: ${jsonData}\n\n`);
                }
                console.log("[SSE Service] Ending stream.");
                res.end();
            }
        };

        // Set up listener for client closing connection using the passed 'req' object
        req.on('close', () => {
            console.log(`[SSE Service] Client disconnected for lesson ${lessonId}.`);
            safeEndStream(); // End the stream if client closes connection
            // Optionally, signal OpenAI to abort if possible and cost-effective
        });

        try {
            const context = await this._getRecommendationContext(lessonId, userId);
            if (!context) {
                console.error(`[SSE Service] Failed to get recommendation context for lesson ${lessonId}`);
                safeEndStream('error', { message: 'Failed to gather information needed for recommendations.' });
                return;
            }
            const { systemPrompt, userMessage } = this._prepareOpenAiPrompts(context, count);

            console.log(`[SSE Service] Prepared prompts for lesson ${lessonId}. Requesting stream from OpenAI.`);

            const openai = new OpenAI();
            const stream = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [systemPrompt, userMessage],
                stream: true,
                temperature: 0.7,
            });

            console.log(`[SSE Service] OpenAI stream initiated for lesson ${lessonId}.`);
            let accumulatedContent = "";

            for await (const chunk of stream) {
                if (streamEnded) {
                    console.log("[SSE Service] Stream end detected while processing OpenAI chunks. Aborting further processing.");
                    // TODO: Abort OpenAI stream if possible?
                    break;
                }
                const contentPiece = chunk.choices[0]?.delta?.content || ''
                accumulatedContent += contentPiece;
                if (LOG_STREAMING_DETAILS) {
                    console.log(`[SSE Chunk L:${lessonId}] ${contentPiece}`);
                }

                // Attempt to parse as JSON array incrementally
                // Find the last complete JSON object in the stream
                try {
                    // Try parsing the whole accumulated content first
                    const potentialJson = JSON.parse(accumulatedContent);
                    if (Array.isArray(potentialJson)) {
                        const validRecs = potentialJson.filter((item: any) => item && item.title && item.description);
                        if (validRecs.length > 0) {
                            const message = JSON.stringify(validRecs);
                            console.log(`[SSE Service] Sending recommendation data for lesson ${lessonId}: ${message}`);
                            res.write(`event: recommendation\ndata: ${message}\n\n`);
                            // Don't clear accumulatedContent here, wait for final result or stream end
                        }
                    }
                } catch (e) {
                    // Handle incomplete JSON or parsing errors gracefully
                    // Check if it *looks* like the start of a JSON array
                    const trimmedContent = accumulatedContent.trim();
                    if (trimmedContent.startsWith('[') && !trimmedContent.endsWith(']')) {
                        // It's likely an incomplete array, send progress update
                        const progressData = JSON.stringify({ progress: 'Receiving recommendations...', partialData: trimmedContent.substring(0, 100) + '...' });
                        if (LOG_STREAMING_DETAILS) {
                            console.log(`[SSE Service] Sending progress update for lesson ${lessonId}`);
                        }
                        res.write(`event: progress\ndata: ${progressData}\n\n`);
                    } else if (trimmedContent.length > 0 && !trimmedContent.startsWith('[')) {
                        // If it's not starting like JSON, maybe it's intro text or an error from OpenAI
                        const nonJsonData = JSON.stringify({ message: trimmedContent });
                        console.warn(`[SSE Service] Received non-JSON chunk start for lesson ${lessonId}: ${trimmedContent.substring(0, 100)}... Sending as message.`);
                        res.write(`event: message\ndata: ${nonJsonData}\n\n`);
                        // Consider ending if this is unexpected
                        // safeEndStream('error', { message: 'Unexpected content format from AI.' });
                        // return;
                    }
                    // Otherwise, just wait for more chunks
                }
            }

            if (!streamEnded) {
                console.log(`[SSE Service] OpenAI stream finished for lesson ${lessonId}. Final accumulated content length: ${accumulatedContent.length}`);
                // Final processing of accumulated content
                try {
                    const finalRecommendations = this._parseAndValidateRecommendations(accumulatedContent);
                    const finalMessage = JSON.stringify(finalRecommendations);
                    console.log(`[SSE Service] Sending final complete recommendations for lesson ${lessonId}: ${finalMessage}`);
                    res.write(`event: recommendation\ndata: ${finalMessage}\n\n`);
                } catch (parseError) {
                    const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse final recommendations.';
                    console.error(`[SSE Service] Error parsing final recommendations for lesson ${lessonId}:`, parseError);
                    console.error(`[SSE Service] Final Raw Content: ${accumulatedContent}`); // Log raw content on error
                    safeEndStream('error', { message: errorMessage });
                    return; // Prevent sending 'done' after error
                }

                safeEndStream('done', { message: 'Streaming complete.' });
            }

        } catch (error) {
            console.error(`[SSE Service] Error during streaming recommendations for lesson ${lessonId}:`, error);
            // Ensure stream is ended even if error occurs during setup or OpenAI call
            const errorMessage = error instanceof Error ? error.message : 'Failed to stream recommendations.';
            safeEndStream('error', { message: errorMessage });
        }
    },
}; 