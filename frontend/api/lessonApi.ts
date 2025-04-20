import { Lesson } from '@shared/models/Lesson.js';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { Student } from '@shared/models/Student';
import apiClient from './apiClient';
import { LessonStatusValue } from '@shared/models/LessonStatus';

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
  console.log('getLessonById called with id:', id);
  try {
    console.log('Making API request to:', `/api/v1/lessons/${id}`);
    const response = await apiClient.get(`/api/v1/lessons/${id}`);
    console.log('API response received:', response.data);
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
      createdAt: new Date(data.quote.createdAt),
      expiresAt: new Date(data.quote.expiresAt)
    });

    return new Lesson({
      id: data.id,
      quote: lessonQuote,
      currentStatusId: data.currentStatusId,
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
 * Updates the status of a specific lesson.
 * @param lessonId The ID of the lesson to update.
 * @param status The new status value.
 * @returns A promise that resolves when the update is complete.
 */
export const updateLessonStatus = async (lessonId: string, status: LessonStatusValue): Promise<void> => {
  try {
    await apiClient.patch(`/api/v1/lessons/${lessonId}`, { newStatus: status });
  } catch (error) {
    console.error(`Error updating lesson ${lessonId} status:`, error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
}; 