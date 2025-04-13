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
      confirmedAt: new Date(data.confirmedAt)
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

export const updateLessonStatus = async (id: string, status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'): Promise<void> => {
  await apiClient.patch(`/api/v1/lessons/${id}/status`, { status });
}; 