import apiClient from './apiClient';
import { Lesson, LessonRequest } from '../types/lesson';

const validateLessonResponse = (data: any): data is Lesson => {
  if (!data || typeof data !== 'object') {
    console.error('Data is null or not an object');
    return false;
  }
  
  if (!data.quote || typeof data.quote !== 'object') {
    console.error('Quote is missing or not an object');
    return false;
  }
  
  if (!data.quote.lessonRequest || typeof data.quote.lessonRequest !== 'object') {
    console.error('LessonRequest is missing or not an object');
    return false;
  }
  
  return true;
};

/**
 * Create a new lesson from a quote
 * This will also expire all other quotes for the same lesson request
 * @param quoteId - Lesson quote ID
 * @returns Created lesson
 */
export const createLessonFromQuote = async (quoteId: string): Promise<Lesson> => {
  try {
    const response = await apiClient.post('/v1/lessons', { quoteId });
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
export const getLessonById = async (lessonId: string): Promise<Lesson> => {
  try {
    const response = await apiClient.get(`/v1/lessons/${lessonId}`);
    
    if (!validateLessonResponse(response.data)) {
      throw new Error('Invalid lesson data structure received from API');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching lesson:', error);
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
    const response = await apiClient.get(`/v1/lessons/quote/${quoteId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lessons by quote:', error);
    throw error;
  }
}; 