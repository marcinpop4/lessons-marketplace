import apiClient from './apiClient';
import { LessonPlan } from '@shared/models/LessonPlan.js';
import { Milestone } from '@shared/models/Milestone.js';
import { Lesson } from '@shared/models/Lesson.js';
import { LessonRequest } from '@shared/models/LessonRequest.js';
import { LessonQuote } from '@shared/models/LessonQuote.js';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus.js';
import { getLessonById } from './lessonApi';
import { LessonStatusValue } from '@shared/models/LessonStatus';
import { AiGeneratedLessonPlan } from '../../shared/models/AiGeneratedLessonPlan.js';

// Helper to combine date and time into ISO-like string for API (moved from CreateLessonPlanPage)
const combineDateTime = (dateStr: string, timeStr: string): string | null => {
    if (!dateStr || !timeStr) return null;
    return `${dateStr}T${timeStr}:00`;
};

// Interface for individual planned lessons within a milestone for the sequence payload
interface PlannedLessonInput {
    selectedDate: string;
    selectedTime: string;
    durationMinutes: number;
}

// Interface for individual milestones for the sequence payload
interface MilestoneInput {
    title: string;
    description: string;
    dueDate: string;
    lessons: PlannedLessonInput[];
}

// Interface for the full payload for creating a lesson plan sequentially - SIMPLIFIED
export interface FullLessonPlanSequencePayload {
    lessonPlanTitle: string;
    lessonPlanDescription: string;
    lessonPlanDueDate: string | null;
    sourceLessonId: string; // This ID will be used to fetch other details
    milestones: MilestoneInput[];
}

// Interface for the payload to create a Lesson Plan
export interface CreateLessonPlanFrontendPayload {
    title: string;
    description: string;
    dueDate?: string | null; // YYYY-MM-DD string or null
    sourceLessonId?: string; // ID of the lesson this plan is based on
    teacherId: string; // ID of the teacher creating the plan
}

// Interface for the payload to create a Milestone
export interface CreateMilestoneFrontendPayload {
    lessonPlanId: string;
    title: string;
    description: string;
    dueDate: string; // YYYY-MM-DD string
}

// Helper function to get token (adjust key based on actual implementation)
const getToken = (): string | null => {
    return localStorage.getItem('auth_token');
};

/**
 * Creates a new Lesson Plan.
 * @param payload The lesson plan data.
 * @returns The created LessonPlan object.
 */
export const createLessonPlan = async (payload: CreateLessonPlanFrontendPayload): Promise<LessonPlan> => {
    try {
        const response = await apiClient.post('/api/v1/lesson-plans', payload);
        // TODO: Adapt parsing if backend returns something different than LessonPlan model directly
        return response.data as LessonPlan;
    } catch (error) {
        console.error('Error creating lesson plan:', error);
        throw error;
    }
};

/**
 * Creates a new Milestone for a Lesson Plan.
 * @param payload The milestone data.
 * @returns The created Milestone object.
 */
export const createMilestone = async (payload: CreateMilestoneFrontendPayload): Promise<Milestone> => {
    try {
        const response = await apiClient.post('/api/v1/milestones', payload);
        // TODO: Adapt parsing if backend returns something different than Milestone model directly
        return response.data as Milestone;
    } catch (error) {
        console.error('Error creating milestone:', error);
        throw error;
    }
};

/**
 * Creates a full lesson plan by sequentially calling APIs for plan, milestones, and planned lessons.
 * It now fetches source lesson details internally using sourceLessonId.
 * Planned lessons are created via a 3-step process: LessonRequest, LessonQuote, then Lesson.
 * @param payload The data for the lesson plan and its components.
 */
export const createFullLessonPlanSequentially = async (payload: FullLessonPlanSequencePayload): Promise<void> => {
    if (!payload.sourceLessonId) {
        throw new Error('API: sourceLessonId is required to create a full lesson plan.');
    }
    const sourceLesson = await getLessonById(payload.sourceLessonId);
    if (!sourceLesson || !sourceLesson.quote || !sourceLesson.quote.lessonRequest || !sourceLesson.quote.teacher || !sourceLesson.quote.lessonRequest.student || !sourceLesson.quote.lessonRequest.address) {
        throw new Error('API: Failed to fetch or validate complete source lesson details.');
    }

    const teacherId = sourceLesson.quote.teacher.id!;
    const studentId = sourceLesson.quote.lessonRequest.student.id!;
    const addressId = sourceLesson.quote.lessonRequest.address.id!;
    const lessonType = sourceLesson.quote.lessonRequest.type;
    const costInCents = sourceLesson.quote.costInCents;
    const hourlyRateInCents = sourceLesson.quote.hourlyRateInCents;

    const lessonPlanPayloadApi = {
        title: payload.lessonPlanTitle,
        description: payload.lessonPlanDescription,
        dueDate: payload.lessonPlanDueDate ? `${payload.lessonPlanDueDate}T00:00:00.000Z` : null,
        sourceLessonId: payload.sourceLessonId,
        teacherId: teacherId,
    };
    console.log('API Seq: Creating lesson plan with payload:', lessonPlanPayloadApi);
    const createdLessonPlan = await createLessonPlan(lessonPlanPayloadApi);
    console.log('API Seq: Lesson plan created:', createdLessonPlan);

    for (const uiMilestone of payload.milestones) {
        const milestonePayloadApi = {
            lessonPlanId: createdLessonPlan.id,
            title: uiMilestone.title,
            description: uiMilestone.description,
            dueDate: `${uiMilestone.dueDate}T00:00:00.000Z`,
        };
        console.log('API Seq: Creating milestone with payload:', milestonePayloadApi);
        const createdMilestone = await createMilestone(milestonePayloadApi);
        console.log('API Seq: Milestone created:', createdMilestone);

        for (const uiPlannedLesson of uiMilestone.lessons) {
            const combinedStartTime = combineDateTime(uiPlannedLesson.selectedDate, uiPlannedLesson.selectedTime);
            if (!combinedStartTime) {
                throw new Error('API Seq: Invalid start time for a planned lesson.');
            }

            // Step 3.1: Create LessonRequest for the planned lesson
            const lessonRequestPayload = {
                studentId: studentId,
                teacherId: teacherId,
                type: lessonType,
                startTime: combinedStartTime,
                durationMinutes: uiPlannedLesson.durationMinutes,
                addressObj: sourceLesson.quote.lessonRequest.address,
            };
            console.log('API Seq (3.1): Creating LessonRequest with payload:', lessonRequestPayload);
            const lrResponse = await apiClient.post('/api/v1/lesson-requests', lessonRequestPayload);
            const createdLessonRequest = lrResponse.data as LessonRequest;
            console.log('API Seq (3.1): LessonRequest created:', createdLessonRequest);

            // Step 3.2: Create LessonQuote for the planned lesson (auto-accepted)
            const lessonQuotePayload = {
                lessonRequestId: createdLessonRequest.id,
                teacherId: teacherId,
                costInCents: costInCents,
                hourlyRateInCents: hourlyRateInCents,
                status: LessonQuoteStatusValue.ACCEPTED,
            };
            console.log('API Seq (3.2): Creating LessonQuote with payload:', lessonQuotePayload);
            const lqResponse = await apiClient.post('/api/v1/lesson-quotes', lessonQuotePayload);

            // Attempt to get the created quote, assuming it might be an array with one item or a direct object
            let createdLessonQuote: LessonQuote | null = null;
            if (Array.isArray(lqResponse.data) && lqResponse.data.length > 0) {
                createdLessonQuote = lqResponse.data[0] as LessonQuote;
            } else if (lqResponse.data && typeof lqResponse.data === 'object' && 'id' in lqResponse.data) {
                createdLessonQuote = lqResponse.data as LessonQuote;
            }

            if (!createdLessonQuote || !createdLessonQuote.id) {
                console.error('API Seq (3.2): Failed to retrieve a valid LessonQuote with an ID from response:', lqResponse.data);
                throw new Error('API Seq (3.2): Failed to create or retrieve a valid LessonQuote with an ID.');
            }
            console.log('API Seq (3.2): LessonQuote processed/retrieved:', createdLessonQuote);

            // Step 3.3: Create Lesson for the planned lesson
            const lessonPayload = {
                quoteId: createdLessonQuote.id,
                milestoneId: createdMilestone.id,
                status: LessonStatusValue.PLANNED,
            };
            console.log('API Seq (3.3): Creating Lesson with payload:', lessonPayload);
            const finalLessonResponse = await apiClient.post('/api/v1/lessons', lessonPayload);
            const createdFinalLesson = finalLessonResponse.data as Lesson;
            console.log('API Seq (3.3): Final Lesson created:', createdFinalLesson);
        }
    }
};

/**
 * Fetches AI-generated lesson plan recommendations via Server-Sent Events (SSE).
 * Uses EventSource and passes auth token as a query parameter.
 * 
 * @param sourceLessonId The ID of the lesson providing context.
 * @param onData Callback function invoked for each received AiGeneratedLessonPlan data chunk.
 * @param onError Callback function invoked if an error occurs during the stream.
 * @param onComplete Callback function invoked when the stream closes successfully (approximated by [DONE] or error).
 * @returns A function to close the EventSource connection.
 */
export const fetchAiLessonPlanRecommendationsStream = (
    sourceLessonId: string,
    onData: (plan: AiGeneratedLessonPlan) => void,
    onError: (error: Event | string) => void,
    onComplete: () => void
): (() => void) => { // Return type is the close function

    const token = getToken(); // Retrieve the auth token
    if (!token) {
        // Cannot proceed without a token, invoke onError immediately
        // Need to ensure onError handles this string input
        onError('Authentication token not found. Cannot connect to stream.');
        // Return a no-op function as we couldn't create the EventSource
        return () => { };
    }

    const url = `/api/v1/lesson-plans/ai-recommendations/stream?sourceLessonId=${encodeURIComponent(sourceLessonId)}&token=${encodeURIComponent(token)}`;
    console.log(`[API] Connecting to SSE stream via EventSource: ${url}`);

    // Create the EventSource instance
    const eventSource = new EventSource(url);
    let streamEnded = false; // Flag to prevent multiple onComplete calls

    eventSource.onopen = () => {
        console.log('[API] SSE connection opened.');
    };

    eventSource.onmessage = (event) => {
        if (streamEnded) return; // Ignore messages after stream has ended
        try {
            if (event.data === '[DONE]') {
                console.log('[API] SSE stream indicated completion ([DONE] message).');
                if (!streamEnded) {
                    streamEnded = true;
                    onComplete();
                    eventSource.close();
                }
                return;
            }
            const planData = JSON.parse(event.data) as AiGeneratedLessonPlan;
            onData(planData);
        } catch (error) {
            console.error('[API] Error parsing SSE data:', error, 'Raw data:', event.data);
            if (!streamEnded) {
                streamEnded = true;
                onError(error instanceof Error ? error.message : 'Failed to parse stream data');
                eventSource.close();
            }
        }
    };

    eventSource.onerror = (error) => {
        console.error('[API] SSE error:', error);
        if (!streamEnded) {
            streamEnded = true;
            onError(error);
            eventSource.close();
            // onComplete is typically NOT called on error, handled by onError logic
        }
    };

    // Return a function to explicitly close the connection
    return () => {
        if (!streamEnded) {
            console.log('[API] Closing SSE connection manually.');
            streamEnded = true;
            eventSource.close();
            // Optionally call onComplete if manual close should be treated as completion
            // onComplete(); 
        }
    };
}; 