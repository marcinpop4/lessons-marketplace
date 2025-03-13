import axios from 'axios';
import apiClient from './apiClient';
import { LessonQuote } from '../types/lesson';

// Base API URL - in a real app, this would come from environment variables
const API_URL = 'http://localhost:3001/api';

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
    const response = await apiClient.get(`/lesson-quotes/request/${lessonRequestId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lesson quotes:', error);
    throw error;
  }
};

/**
 * Accept a lesson quote
 * This will also expire all other quotes for the same lesson request
 * @param quoteId - Lesson quote ID
 * @returns Accepted lesson quote
 */
export const acceptLessonQuote = async (quoteId: string): Promise<LessonQuote> => {
  try {
    const response = await apiClient.post(`/lesson-quotes/${quoteId}/accept`);
    return response.data;
  } catch (error) {
    console.error('Error accepting lesson quote:', error);
    throw error;
  }
}; 