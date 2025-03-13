import apiClient from './apiClient';
import { Lesson } from '../types/lesson';

/**
 * Create a new lesson from a quote
 * This will also expire all other quotes for the same lesson request
 * @param quoteId - Lesson quote ID
 * @returns Created lesson
 */
export const createLessonFromQuote = async (quoteId: string): Promise<Lesson> => {
  try {
    const response = await apiClient.post('/lessons', { quoteId });
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
    const response = await apiClient.get(`/lessons/${lessonId}`);
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
    const response = await apiClient.get(`/lessons/quote/${quoteId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lessons by quote:', error);
    throw error;
  }
}; 