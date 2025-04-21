import { Lesson } from '@shared/models/Lesson.js';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { Student } from '@shared/models/Student';
import apiClient from './apiClient';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
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
      createdAt: new Date(data.quote.createdAt)
    });

    // Ensure currentStatus is provided as LessonStatusValue enum
    // Assuming the API returns the status string like "ACCEPTED" in data.currentStatus
    const statusValue = data.currentStatus as LessonStatusValue;
    if (!statusValue || !Object.values(LessonStatusValue).includes(statusValue)) {
      console.error(`Invalid or missing status value received from API: ${statusValue}`);
      // Handle the error appropriately, maybe throw or return a default/error state
      // For now, throwing an error:
      throw new Error(`Invalid or missing status value received from API: ${statusValue}`);
    }

    return new Lesson({
      id: data.id,
      quote: lessonQuote,
      currentStatusId: data.currentStatusId,
      currentStatus: statusValue, // Pass the validated enum value
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
 * Update the status of a lesson.
 * @param lessonId The ID of the lesson to update.
 * @param newStatus The new status value to set.
 */
export const updateLessonStatus = async (lessonId: string, newStatus: LessonStatusValue): Promise<void> => {
  // Check if the provided status is a valid enum value
  if (!Object.values(LessonStatusValue).includes(newStatus)) {
    const errorMsg = `Invalid status value provided: ${newStatus}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const requestUrl = `/api/v1/lessons/${lessonId}`;
  const requestBody = { newStatus: newStatus };
  const requestMethod = 'PATCH';

  try {
    // Send the resulting status value to the endpoint
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