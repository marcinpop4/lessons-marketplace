import { Lesson } from '@shared/models/Lesson';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { Student } from '@shared/models/Student';
import apiClient from './apiClient';

// Check for API base URL using Vite's import.meta.env
if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is not set');
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

    return new Lesson(
      data.id,
      new LessonQuote(
        data.quote.id,
        new LessonRequest(
          data.quote.lessonRequest.id,
          data.quote.lessonRequest.type,
          new Date(data.quote.lessonRequest.startTime),
          data.quote.lessonRequest.durationMinutes,
          new Address(
            data.quote.lessonRequest.address.street,
            data.quote.lessonRequest.address.city,
            data.quote.lessonRequest.address.state,
            data.quote.lessonRequest.address.postalCode,
            data.quote.lessonRequest.address.country
          ),
          new Student(
            data.quote.lessonRequest.student.id,
            data.quote.lessonRequest.student.firstName,
            data.quote.lessonRequest.student.lastName,
            data.quote.lessonRequest.student.email,
            data.quote.lessonRequest.student.phoneNumber,
            new Date(data.quote.lessonRequest.student.dateOfBirth)
          )
        ),
        new Teacher(
          data.quote.teacher.id,
          data.quote.teacher.firstName,
          data.quote.teacher.lastName,
          data.quote.teacher.email,
          data.quote.teacher.phoneNumber,
          new Date(data.quote.teacher.dateOfBirth),
          data.quote.teacher.hourlyRates
        ),
        data.quote.costInCents,
        data.quote.hourlyRateInCents,
        new Date(data.quote.createdAt),
        new Date(data.quote.expiresAt)
      ),
      data.currentStatusId,
      new Date(data.confirmedAt)
    );
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

export const updateLessonStatus = async (id: string, status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'): Promise<void> => {
  await apiClient.patch(`/api/v1/lessons/${id}/status`, { status });
}; 