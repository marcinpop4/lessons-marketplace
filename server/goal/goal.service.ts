import { Prisma } from '@prisma/client';
import { Goal, GoalStatus, GoalStatusTransition, GoalStatusValue, DbGoalWithStatus, Lesson } from '../../shared/models/index.js';
import { DbLessonWithNestedRelations } from '../../shared/models/Lesson.js';
import { randomUUID } from 'crypto';
// import { AppError } from '../utils/AppError.js'; // Old import
import { NotFoundError, BadRequestError } from '../errors/index.js';
import OpenAI from 'openai';
import { studentService } from '../student/student.service.js';
import { lessonService } from '../lesson/lesson.service.js';
import { teacherService } from '../teacher/teacher.service.js';
import prisma from '../prisma.js';
import { LessonType } from '../../shared/models/LessonType.js';
import { GoalRecommendation } from '../../shared/models/GoalRecommendation.js';
import { Response } from 'express';

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
     */
    async createGoal(lessonId: string, title: string, description: string, estimatedLessonCount: number): Promise<Goal> {
        // Check if the lesson exists
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
        });

        if (!lesson) {
            // throw new Error(`Lesson with ID ${lessonId} not found.`);
            throw new NotFoundError(`Lesson with ID ${lessonId} not found.`);
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
        const goalModel = Goal.fromDb(createdGoalWithStatus as DbGoalWithStatus); // Cast needed here
        if (!goalModel) {
            // Handle cases where fromDb might return null
            throw new Error(`Failed to construct Goal model from created DB data for goal ID: ${goalId}`);
        }

        return goalModel;
    },

    /**
     * Updates the status of an existing Goal.
     */
    async updateGoalStatus(
        goalId: string,
        transition: GoalStatusTransition,
        context: Prisma.JsonValue | null = null
    ): Promise<Goal> {
        // Fetch the goal *just to check existence* before transaction
        // Access model via prisma.goal
        const goalExists = await prisma.goal.findUnique({
            where: { id: goalId },
            select: { id: true }
        });

        if (!goalExists) {
            // Throw error here if goal doesn't exist before starting transaction
            throw new NotFoundError(`Goal with ID ${goalId} not found.`);
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
        const goalModel = Goal.fromDb(updatedGoalWithStatus as DbGoalWithStatus); // Cast needed here
        if (!goalModel) {
            // Handle cases where fromDb might return null
            throw new Error(`Failed to construct Goal model from updated DB data for goal ID: ${goalId}`);
        }

        return goalModel;
    },

    /**
     * Retrieves a Goal by its ID.
     */
    async getGoalById(goalId: string): Promise<Goal | null> {
        const goalData = await prisma.goal.findUnique({
            where: { id: goalId },
            include: { currentStatus: true } // Ensure status is included
        });

        if (!goalData) {
            return null;
        }

        // Use the factory method
        return Goal.fromDb(goalData as DbGoalWithStatus); // Cast needed as Prisma types don't automatically narrow
    },

    /**
    * Retrieves all Goals for a specific Lesson.
    */
    async getGoalsByLessonId(lessonId: string): Promise<Goal[]> {
        const goalsData = await prisma.goal.findMany({
            where: { lessonId: lessonId },
            orderBy: { createdAt: 'asc' },
            include: {
                currentStatus: true // Ensure status is included
            }
        });

        // Use the factory method and filter out nulls
        return goalsData
            .map(goalData => Goal.fromDb(goalData as DbGoalWithStatus)) // Cast needed
            .filter((goal): goal is Goal => goal !== null); // Type guard to filter nulls and satisfy TS
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
    async _getRecommendationContext(lessonId: string) {
        const currentLesson = await lessonService.getLessonById(lessonId);
        if (!currentLesson) throw new NotFoundError(`Lesson ${lessonId} not found`);

        const studentId = currentLesson.quote.lessonRequest.student.id;
        const teacherId = currentLesson.quote.teacher.id;
        const student = await studentService.findById(studentId);
        if (!student) throw new NotFoundError(`Student ${studentId} not found`);

        const allTeacherLessons = await teacherService.findLessonsByTeacherId(teacherId);
        const pastLessons = allTeacherLessons
            .filter(l => l.quote.lessonRequest.student.id === studentId && l.id !== lessonId)
            .sort((a, b) => new Date(b.quote.lessonRequest.startTime).getTime() - new Date(a.quote.lessonRequest.startTime).getTime());
        const currentLessonGoals = await this.getGoalsByLessonId(lessonId);

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
                status: currentLesson.currentStatus.status,
                goals: currentLessonGoals.map(g => ({
                    title: g.title,
                    description: g.description, // Keep description for context
                    status: g.currentStatus.status
                }))
            },
            pastLessons: pastLessons.map(l => ({
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
     * Generates AI-powered goal recommendations for a lesson (Standard API Call)
     */
    async generateGoalRecommendations(
        lessonId: string
    ): Promise<GoalRecommendation[]> {
        const context = await this._getRecommendationContext(lessonId);
        // Provide a default count for the non-streaming version
        const { systemPrompt, userMessage } = this._prepareOpenAiPrompts(context, 5);

        // 7. Call OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4", // Consider newer/cheaper models if appropriate
                messages: [systemPrompt, userMessage],
                temperature: 0.7,
                max_tokens: 2000,
                // Ensure response format is JSON if available and desired
                // response_format: { type: "json_object" }, // Uncomment if using compatible model
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            return this._parseAndValidateRecommendations(response);
        } catch (error) {
            console.error('Error generating goal recommendations:', error);
            throw new Error('Failed to generate goal recommendations');
        }
    },

    // === New Streaming Service Method - V2 (Real-time Parsing) ===
    async streamGoalRecommendations(lessonId: string, count: number, res: Response): Promise<void> {
        console.log(`[SSE] streamGoalRecommendations started for lesson ${lessonId}, count = ${count} `);
        let streamEnded = false;
        let openAiStreamFinished = false;

        res.on('close', () => {
            console.log(`[SSE] Client disconnected for lesson ${lessonId}`);
            streamEnded = true;
        });

        try {
            // 1. Get data & Prepare prompts using helpers
            const context = await this._getRecommendationContext(lessonId);
            const { systemPrompt, userMessage } = this._prepareOpenAiPrompts(context, count);

            // 2. Call OpenAI with stream: true
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            // Explicitly type parameters and ensure stream is true
            const openAiParams: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
                model: "gpt-4",
                messages: [systemPrompt, userMessage],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true, // Explicitly true for type inference
            };

            // Always log the exact parameters object being sent (excluding API key)
            // Remove log-specific modifications and pretty-printing
            console.log(`[OpenAI] Calling chat.completions.create with params: ${JSON.stringify(openAiParams)}`);
            // Note: Logging the full messages array content can significantly increase log size.

            const stream = await openai.chat.completions.create(openAiParams);
            // Now TypeScript knows `stream` is definitely an AsyncIterable

            if (!streamEnded) {
                res.write(`event: message\ndata: ${JSON.stringify({ status: 'AI stream started...' })} \n\n`);
            }

            // 3. Process stream chunk by chunk, parsing complete objects in real-time
            let buffer = '';
            let recommendationCount = 0;

            for await (const chunk of stream) {
                if (streamEnded) break;
                const contentDelta = chunk.choices[0]?.delta?.content || '';
                // Restore chunk logging - Conditionally log
                if (LOG_STREAMING_DETAILS) {
                    console.log(`[SSE Chunk][${Date.now()}] Delta: '${contentDelta}'`);
                }
                buffer += contentDelta;
                // Conditionally log buffer state
                // if (LOG_STREAMING_DETAILS) {
                //     console.log(`[SSE Buffer] Current buffer: '${buffer}'`); // Debug log
                // }

                // Try to process complete objects from the buffer
                let objectFound = true;
                while (objectFound) {
                    objectFound = false; // Assume no object found in this pass
                    const objectStartIndex = buffer.indexOf('{');
                    if (objectStartIndex === -1) {
                        // No object start found, wait for more data
                        break;
                    }

                    // Discard anything before the first potential object starts
                    // (handles leading whitespace, commas, or array brackets)
                    if (objectStartIndex > 0) {
                        buffer = buffer.substring(objectStartIndex);
                    }

                    let braceLevel = 0;
                    let objectEndIndex = -1;
                    for (let i = 0; i < buffer.length; i++) {
                        if (buffer[i] === '{') {
                            braceLevel++;
                        } else if (buffer[i] === '}') {
                            braceLevel--;
                            if (braceLevel === 0) {
                                objectEndIndex = i;
                                break; // Found the matching closing brace
                            }
                        } else if (braceLevel < 0) {
                            // Should not happen with well-formed JSON, but reset defensively
                            console.warn('[SSE] Resetting brace level due to unexpected negative value.');
                            braceLevel = 0;
                            break; // Stop scanning this potential object
                        }
                    }

                    if (objectEndIndex !== -1) {
                        // Potential complete object found
                        const objectStr = buffer.substring(0, objectEndIndex + 1);
                        try {
                            const parsedObject = JSON.parse(objectStr);
                            // Check for expected structure ({ goal: {...} })
                            if (parsedObject && typeof parsedObject.goal === 'object') {
                                const recommendation = new GoalRecommendation(parsedObject);
                                recommendationCount++;
                                if (!streamEnded) {
                                    const beforeWriteTs = Date.now();
                                    // Conditionally log pre/post write details
                                    if (LOG_STREAMING_DETAILS) {
                                        console.log(`[SSE][${beforeWriteTs}]PRE - WRITE recommendation #${recommendationCount}: ${recommendation.title} `);
                                    }
                                    res.write(`event: recommendation\ndata: ${JSON.stringify(recommendation)} \n\n`);
                                    const afterWriteTs = Date.now();
                                    // Conditionally log post-write details
                                    if (LOG_STREAMING_DETAILS) {
                                        console.log(`[SSE][${afterWriteTs}]POST - WRITE recommendation #${recommendationCount} (Write took ${afterWriteTs - beforeWriteTs}ms)`);
                                    }
                                }
                                // Remove the successfully processed object from the buffer
                                buffer = buffer.substring(objectEndIndex + 1).trimStart();
                                // Remove potential leading comma after the object
                                if (buffer.startsWith(',')) {
                                    buffer = buffer.substring(1).trimStart();
                                }
                                objectFound = true; // Signal that we found and processed an object, loop again
                            } else {
                                // Parsed JSON but not the shape we expect, might be incomplete array wrapper? Wait.
                                // console.log('[SSE] Parsed object, but no .goal property. Buffer:', buffer);
                                break; // Wait for more data
                            }
                        } catch (e) {
                            // JSON parse failed, likely incomplete object, wait for more data
                            // console.log('[SSE] Incomplete JSON, waiting for more data. Buffer:', buffer);
                            break; // Wait for more data
                        }
                    } else {
                        // No closing brace found yet for the current starting brace
                        // Wait for more data
                        break;
                    }
                } // end while(objectFound)
            } // end for await...of stream

            openAiStreamFinished = true;
            console.log(`[SSE] OpenAI stream finished processing loop for lesson ${lessonId}.Sent ${recommendationCount} recommendations.`);

            // Final check on buffer - should ideally be empty or just whitespace/array end bracket
            // Conditionally log remaining buffer warning
            if (LOG_STREAMING_DETAILS && buffer.trim().length > 0 && buffer.trim() !== ']') {
                console.warn(`[SSE] Final remaining buffer content: '${buffer}'`);
            }

            // 4. Send end event
            if (!streamEnded) {
                res.write(`event: end\ndata: ${JSON.stringify({ message: 'Stream finished successfully.', count: recommendationCount })} \n\n`);
                console.log(`[SSE] Sent end event for lesson ${lessonId}`);
            }

        } catch (error) {
            const processingError = error instanceof Error ? error : new Error(String(error));
            console.error(`[SSE] Error during stream for lesson ${lessonId}: `, processingError);
            if (!streamEnded && !res.writableEnded) {
                try {
                    res.write(`event: error\ndata: ${JSON.stringify({ message: processingError.message })} \n\n`);
                } catch (writeError) {
                    console.error("[SSE] Failed to write error event to stream:", writeError);
                }
            }
        } finally {
            // 7. Ensure connection is closed
            if (!streamEnded && !res.writableEnded) {
                res.end();
                console.log(`[SSE] Connection ended via finally block for lesson ${lessonId}(OpenAI stream finished: ${openAiStreamFinished})`);
            } else {
                console.log(`[SSE] Connection already ended for lesson ${lessonId}(OpenAI stream finished: ${openAiStreamFinished}), not calling res.end() again.`);
            }
        }
    }
}; 