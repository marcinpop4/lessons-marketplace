import { Teacher } from '@shared/models/Teacher';
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonType } from '@shared/models/LessonType';
import apiClient from './apiClient';

// Interface for teacher with hourly rate information
export interface TeacherWithRates extends Teacher {
  lessonHourlyRates: {
    [key in LessonType]?: number;
  };
}

/**
 * Get available teachers for a specific lesson type
 * @param lessonType - Type of lesson
 * @param limit - Maximum number of teachers to return (default: 5)
 * @returns Array of teachers with their hourly rates
 */
export const getAvailableTeachers = async (
  lessonType: LessonType,
  limit: number = 5
): Promise<Teacher[]> => {
  const response = await apiClient.get(`/api/v1/teachers/available?lessonType=${lessonType}&limit=${limit}`);
  return response.data;
};

/**
 * Create quotes for a lesson request
 * @param lessonRequestId - Lesson request ID
 * @param lessonType - Type of lesson
 * @returns Array of created quotes
 */
export const createLessonQuotes = async (
  lessonRequestId: string,
  lessonType: LessonType
): Promise<LessonQuote[]> => {
  const response = await apiClient.post('/api/v1/lesson-quotes/create-quotes', {
    lessonRequestId,
    lessonType
  });

  return response.data.map((quote: any) => {
    const lessonRequest = new LessonRequest(
      quote.lessonRequest.id,
      quote.lessonRequest.type,
      new Date(quote.lessonRequest.startTime),
      quote.lessonRequest.durationMinutes,
      quote.lessonRequest.address,
      quote.lessonRequest.student,
      quote.lessonRequest.addressObj
    );

    return new LessonQuote(
      quote.id,
      lessonRequest,
      quote.teacher,
      quote.costInCents,
      new Date(quote.createdAt),
      new Date(quote.expiresAt),
      quote.hourlyRateInCents,
      quote.status
    );
  });
};

/**
 * Book a lesson from a quote
 * @param quoteId - Lesson quote ID
 * @returns Created lesson
 */
export const bookLesson = async (quoteId: string): Promise<any> => {
  try {
    const confirmedAt = new Date().toISOString();

    const response = await apiClient.post(`/api/v1/lessons`, {
      quoteId,
      confirmedAt,
    });

    return response.data;
  } catch (error) {
    console.error('Error booking lesson:', error);
    throw error;
  }
}; 