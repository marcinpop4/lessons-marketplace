import { Lesson } from '@shared/models/Lesson';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { Student } from '@shared/models/Student';
import apiClient from './apiClient';
import { LessonStatus, LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { LessonQuoteStatus, LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';
import axios, { AxiosError } from 'axios';

// Check for API base URL using Vite's import.meta.env
if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is not set');
}

// Define the expected shape of the data returned by the fetch endpoint
// Omit startTime from base Lesson as API sends it as string
export interface FullLessonDetailsForTeacher extends Omit<Lesson, 'startTime'> {
  // Example fields - adjust based on actual API response
  studentName: string;
  lessonType: string; // e.g., 'Guitar', 'Piano'
  startTime: string; // Keep as string from API
  durationMinutes: number;
  status: LessonStatusValue; // Make sure status is included
  // Potentially other fields like quoteId, requestId, address details etc.
}

/**
 * Create a new lesson from a quote
 * This will also expire all other quotes for the same lesson request
 * @param quoteId - Lesson quote ID
 * @returns Created lesson
 */
export const createLessonFromQuote = async (quoteId: string): Promise<Lesson> => {
  try {
    const response = await apiClient.post('/api/v1/lessons', { quoteId });
    return response.data;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

/**
 * Get a lesson by ID
 * @param lessonId - Lesson ID
 * @returns Lesson data
 */
export const getLessonById = async (id: string): Promise<Lesson> => {
  try {
    const response = await apiClient.get(`/api/v1/lessons/${id}`);
    const data = response.data;

    // Map the nested currentStatus from the API response for the quote
    const quoteStatusData = data.quote.currentStatus; // Assuming API includes this nested status
    const quoteCurrentStatusModel = quoteStatusData
      ? new LessonQuoteStatus({
        id: quoteStatusData.id,
        lessonQuoteId: data.quote.id,
        status: quoteStatusData.status as LessonQuoteStatusValue, // Add type assertion
        context: quoteStatusData.context || null,
        createdAt: quoteStatusData.createdAt ? new Date(quoteStatusData.createdAt) : new Date()
      })
      : null;

    const lessonQuote = new LessonQuote({
      id: data.quote.id,
      lessonRequest: new LessonRequest({
        id: data.quote.lessonRequest.id,
        type: data.quote.lessonRequest.type,
        startTime: new Date(data.quote.lessonRequest.startTime),
        durationMinutes: data.quote.lessonRequest.durationMinutes,
        address: new Address({
          street: data.quote.lessonRequest.address.street,
          city: data.quote.lessonRequest.address.city,
          state: data.quote.lessonRequest.address.state,
          postalCode: data.quote.lessonRequest.address.postalCode,
          country: data.quote.lessonRequest.address.country
        }),
        student: new Student({
          id: data.quote.lessonRequest.student.id,
          firstName: data.quote.lessonRequest.student.firstName,
          lastName: data.quote.lessonRequest.student.lastName,
          email: data.quote.lessonRequest.student.email,
          phoneNumber: data.quote.lessonRequest.student.phoneNumber,
          dateOfBirth: new Date(data.quote.lessonRequest.student.dateOfBirth)
        })
      }),
      teacher: new Teacher({
        id: data.quote.teacher.id,
        firstName: data.quote.teacher.firstName,
        lastName: data.quote.teacher.lastName,
        email: data.quote.teacher.email,
        phoneNumber: data.quote.teacher.phoneNumber,
        dateOfBirth: new Date(data.quote.teacher.dateOfBirth),
        hourlyRates: data.quote.teacher.hourlyRates
      }),
      costInCents: data.quote.costInCents,
      hourlyRateInCents: data.quote.hourlyRateInCents,
      currentStatus: quoteCurrentStatusModel, // Pass the mapped status object
      currentStatusId: quoteCurrentStatusModel?.id ?? null, // Pass the ID from the mapped status
      createdAt: new Date(data.quote.createdAt)
    });

    // Assuming the API response data includes the full currentStatus object
    // or at least the necessary fields to construct it.
    // Let's assume data.currentStatus is an object like { id, status, context, createdAt }
    const statusData = data.currentStatus; // Assuming API returns the full status object
    if (!statusData || typeof statusData !== 'object' || !statusData.status || !Object.values(LessonStatusValue).includes(statusData.status as LessonStatusValue)) {
      console.error(`Invalid or missing status data received from API:`, statusData);
      throw new Error(`Invalid or incomplete lesson status data received from API.`);
    }

    // Construct the LessonStatus object
    const lessonStatus = new LessonStatus({
      id: statusData.id, // Use the ID from the status object
      lessonId: data.id, // Use the main lesson ID
      status: statusData.status as LessonStatusValue,
      context: statusData.context || null,
      createdAt: statusData.createdAt ? new Date(statusData.createdAt) : new Date()
    });

    return new Lesson({
      id: data.id,
      quote: lessonQuote,
      currentStatus: lessonStatus, // Pass the full LessonStatus object
    });
  } catch (error) {
    console.error('Error in getLessonById:', error);
    throw error;
  }
};

/**
 * Get lessons for a specific quote
 * @param quoteId - Quote ID
 * @returns Array of lessons
 */
export const getLessonsByQuoteId = async (quoteId: string): Promise<Lesson[]> => {
  try {
    const response = await apiClient.get(`/api/v1/lessons/quote/${quoteId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lessons by quote:', error);
    throw error;
  }
};

/**
 * Fetches all lessons associated with a specific teacher.
 * @param teacherId The ID of the teacher.
 * @returns A promise that resolves to an array of lessons with details.
 */
export const fetchTeacherLessons = async (teacherId: string): Promise<FullLessonDetailsForTeacher[]> => {
  if (!teacherId) {
    throw new Error("Teacher ID is required to fetch lessons.");
  }
  try {
    const response = await apiClient.get(`/api/v1/teacher/${teacherId}/lessons`);
    // Ensure the response data is an array
    if (!Array.isArray(response.data)) {
      console.error("API did not return an array for teacher lessons:", response.data);
      throw new Error("Unexpected response format from API.");
    }
    // TODO: Add validation here (e.g., using Zod) to ensure data matches FullLessonDetailsForTeacher
    return response.data as FullLessonDetailsForTeacher[];
  } catch (error: any) {
    console.error(`Error fetching lessons for teacher ${teacherId}:`, error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch lessons';
    // Re-throw a more specific error or the original error
    throw new Error(errorMessage);
  }
};

/**
 * Update the status of a lesson using a transition.
 * @param lessonId The ID of the lesson to update.
 * @param transition The transition action to perform.
 * @param context Optional context data for the status change.
 */
export const updateLessonStatus = async (lessonId: string, transition: LessonStatusTransition, context?: any): Promise<void> => {
  // Remove validation based on newStatus
  // if (!Object.values(LessonStatusValue).includes(newStatus)) { ... }

  const requestUrl = `/api/v1/lessons/${lessonId}`;
  // Send transition and context in the body
  const requestBody = { transition, context };
  const requestMethod = 'PATCH';

  try {
    await apiClient.patch(requestUrl, requestBody);
  } catch (error) {
    let logMessage = `API Error updating lesson status: ${error}`; // Default message

    // Check if it's an AxiosError with response info
    if (axios.isAxiosError(error) && error.response) {
      logMessage =
        `${requestMethod} ${requestUrl} ${JSON.stringify(requestBody)} - Failed with Status Code: ${error.response.status} (${error.response.statusText})`;

      // Optionally log the response data if available
      if (error.response.data) {
        logMessage += `\nResponse Body: ${JSON.stringify(error.response.data)}`;
      }
    } else if (error instanceof Error) {
      logMessage = `API Error updating lesson status (${requestMethod} ${requestUrl}): ${error.message}`;
    }

    console.error(logMessage);
    // Rethrow the original error to be handled by the calling component
    throw error;
  }
};

// Interface for the payload to create a planned lesson associated with a milestone
export interface CreatePlannedLessonPayload {
  milestoneId: string;
  studentId: string;
  teacherId: string;
  lessonType: string; // e.g., Guitar, Piano - from LessonType model if available
  startTime: string; // ISO-like string (YYYY-MM-DDTHH:MM:SS)
  durationMinutes: number;
  addressId: string; // ID of the address for the lesson
  status?: string; // Explicit status, e.g., "PLANNED". Backend needs to handle this.
}

/**
 * Creates a new planned lesson associated with a milestone.
 * This will likely involve creating a LessonRequest, LessonQuote (auto-accepted), and Lesson.
 * The backend will need a specific endpoint to handle this creation logic.
 * @param payload The planned lesson data.
 * @returns The created Lesson object.
 */
export const createPlannedLesson = async (payload: CreatePlannedLessonPayload): Promise<Lesson> => {
  try {
    // Use the existing /api/v1/lessons endpoint
    const response = await apiClient.post('/api/v1/lessons', payload);
    // TODO: Adapt parsing if backend returns something different than Lesson model directly
    return response.data as Lesson;
  } catch (error) {
    console.error('Error creating planned lesson:', error);
    throw error;
  }
}; 