import axios from 'axios';
import apiClient from './apiClient';
import { LessonQuote } from '../types/lesson';
import { getLessonById } from './lessonApi';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    withCredentials: true, // Include cookies for refresh token
  };
};

/**
 * Get quotes for a lesson request
 * @param lessonRequestId - Lesson request ID
 * @returns Array of lesson quotes
 */
export const getLessonQuotesByRequestId = async (lessonRequestId: string): Promise<LessonQuote[]> => {
  try {
    const response = await apiClient.get(`/v1/lesson-quotes/request/${lessonRequestId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lesson quotes:', error);
    throw error;
  }
};

/**
 * Accept a lesson quote
 * This will also create a lesson and expire all other quotes for the same lesson request
 * @param quoteId - Lesson quote ID
 * @returns Accepted lesson quote with created lesson ID
 */
export const acceptLessonQuote = async (quoteId: string): Promise<{ id: string; lesson: { id: string } }> => {
  try {
    // Log the API call details
    console.log(`Accepting quote with ID: ${quoteId}`);
    
    const response = await apiClient.post(`/v1/lesson-quotes/${quoteId}/accept`);
    
    // Log the response for debugging
    console.log('Accept quote response:', response.data);
    
    // Validate that the response contains the expected data structure
    if (!response.data || !response.data.lesson || !response.data.lesson.id) {
      console.error('Invalid response structure from quote acceptance:', response.data);
      throw new Error('Invalid response format from server. Missing lesson ID in response.');
    }
    
    return {
      id: response.data.id,
      lesson: {
        id: response.data.lesson.id
      }
    };
  } catch (error) {
    console.error('Error accepting lesson quote:', error);
    throw error;
  }
}; 