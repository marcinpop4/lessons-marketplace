import { Teacher, LessonQuote, LessonType } from '../types/lesson';
import apiClient from './apiClient';

// Base API URL - in a real app, this would come from environment variables
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

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
): Promise<TeacherWithRates[]> => {
  try {
    const response = await apiClient.get(`/teachers`, {
      params: { lessonType, limit }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    throw error;
  }
};

/**
 * Create a lesson quote for a teacher and lesson request
 * @param lessonRequestId - Lesson request ID
 * @param teacherId - Teacher ID
 * @param costInCents - Cost in cents
 * @returns Created lesson quote
 */
export const createLessonQuote = async (
  lessonRequestId: string,
  teacherId: string,
  costInCents: number
): Promise<LessonQuote> => {
  try {
    // Create an expiration date 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const response = await apiClient.post(`/lesson-quotes`, {
      lessonRequestId,
      teacherId,
      costInCents,
      expiresAt: expiresAt.toISOString(),
    });

    return response.data;
  } catch (error) {
    console.error('Error creating lesson quote:', error);
    throw error;
  }
};

/**
 * Book a lesson from a quote
 * @param quoteId - Lesson quote ID
 * @returns Created lesson
 */
export const bookLesson = async (quoteId: string): Promise<any> => {
  try {
    const confirmedAt = new Date().toISOString();
    
    const response = await apiClient.post(`/lessons`, {
      quoteId,
      confirmedAt,
    });

    return response.data;
  } catch (error) {
    console.error('Error booking lesson:', error);
    throw error;
  }
}; 