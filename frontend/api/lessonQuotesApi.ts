import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import apiClient from './apiClient';

/**
 * Get quotes for a lesson request
 * @param lessonRequestId - Lesson request ID
 * @returns Array of lesson quotes
 */
export const getLessonQuotesByRequestId = async (lessonRequestId: string): Promise<LessonQuote[]> => {
  const response = await apiClient.get(`/api/v1/lesson-quotes/request/${lessonRequestId}`);
  return response.data.map((quote: any) => {
    const lessonRequest = new LessonRequest({
      id: quote.lessonRequest.id,
      type: quote.lessonRequest.type,
      startTime: new Date(quote.lessonRequest.startTime),
      durationMinutes: quote.lessonRequest.durationMinutes,
      address: quote.lessonRequest.address,
      student: quote.lessonRequest.student
    });
    const teacher = quote.teacher;
    return new LessonQuote({
      id: quote.id,
      lessonRequest,
      teacher,
      costInCents: quote.costInCents,
      hourlyRateInCents: quote.hourlyRateInCents,
      createdAt: new Date(quote.createdAt),
      expiresAt: new Date(quote.expiresAt)
    });
  });
};

/**
 * Accept a lesson quote
 * This will also create a lesson and expire all other quotes for the same lesson request
 * @param quoteId - Lesson quote ID
 * @returns Accepted lesson quote with created lesson ID
 */
export const acceptLessonQuote = async (quoteId: string): Promise<{ id: string; lesson: { id: string } }> => {
  const response = await apiClient.post(`/api/v1/lesson-quotes/${quoteId}/accept`);
  return response.data;
}; 