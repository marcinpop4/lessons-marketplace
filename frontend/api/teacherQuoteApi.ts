import { Teacher } from '@shared/models/Teacher';
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonType } from '@shared/models/LessonType';
import apiClient from './apiClient';
import { Student } from '@shared/models/Student';
import { Address } from '@shared/models/Address';

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
    // Create dependent models first
    const student = new Student({
      id: quote.lessonRequest.student.id,
      firstName: quote.lessonRequest.student.firstName,
      lastName: quote.lessonRequest.student.lastName,
      email: quote.lessonRequest.student.email,
      phoneNumber: quote.lessonRequest.student.phoneNumber,
      dateOfBirth: new Date(quote.lessonRequest.student.dateOfBirth)
    });

    const address = new Address({
      street: quote.lessonRequest.address.street,
      city: quote.lessonRequest.address.city,
      state: quote.lessonRequest.address.state,
      postalCode: quote.lessonRequest.address.postalCode,
      country: quote.lessonRequest.address.country
    });

    const lessonRequest = new LessonRequest({
      id: quote.lessonRequest.id,
      type: quote.lessonRequest.type,
      startTime: new Date(quote.lessonRequest.startTime),
      durationMinutes: quote.lessonRequest.durationMinutes,
      address,
      student
    });

    const teacher = new Teacher({
      id: quote.teacher.id,
      firstName: quote.teacher.firstName,
      lastName: quote.teacher.lastName,
      email: quote.teacher.email,
      phoneNumber: quote.teacher.phoneNumber,
      dateOfBirth: new Date(quote.teacher.dateOfBirth)
      // Missing hourlyRates? Assuming they are not needed here or fetched separately
    });

    // Create the LessonQuote using object pattern
    return new LessonQuote({
      id: quote.id,
      lessonRequest,
      teacher,
      costInCents: quote.costInCents,
      hourlyRateInCents: quote.hourlyRateInCents,
      createdAt: new Date(quote.createdAt)
    });
  });
};

/**
 * Book a lesson from a quote
 * @param quoteId - Lesson quote ID
 * @returns Created lesson
 */
export const bookLesson = async (quoteId: string): Promise<any> => {
  try {
    // Make the POST request to create the lesson
    const response = await apiClient.post(`/api/v1/lessons`, {
      quoteId,
    });

    return response.data;
  } catch (error) {
    console.error('Error booking lesson:', error);
    throw error;
  }
};

// Interface for the raw quote data from the API
interface ApiQuoteData {
  id: string;
  costInCents: number;
  hourlyRateInCents: number;
  createdAt: string;
  expiresAt: string;
  lessonRequest: any; // Define more strictly if possible
  teacher: any;       // Define more strictly if possible
}

// Function to transform raw API data into domain models
const transformQuotes = (quotesData: ApiQuoteData[]): LessonQuote[] => {
  return quotesData.map((quote: ApiQuoteData) => {
    // Transform nested data first
    const address = new Address({
      street: quote.lessonRequest.address.street,
      city: quote.lessonRequest.address.city,
      state: quote.lessonRequest.address.state,
      postalCode: quote.lessonRequest.address.postalCode,
      country: quote.lessonRequest.address.country
    });

    const student = new Student({
      id: quote.lessonRequest.student.id,
      firstName: quote.lessonRequest.student.firstName,
      lastName: quote.lessonRequest.student.lastName,
      email: quote.lessonRequest.student.email,
      phoneNumber: quote.lessonRequest.student.phoneNumber,
      dateOfBirth: new Date(quote.lessonRequest.student.dateOfBirth)
    });

    const lessonRequest = new LessonRequest({
      id: quote.lessonRequest.id,
      type: quote.lessonRequest.type,
      startTime: new Date(quote.lessonRequest.startTime),
      durationMinutes: quote.lessonRequest.durationMinutes,
      address,
      student
    });

    const teacher = new Teacher({
      id: quote.teacher.id,
      firstName: quote.teacher.firstName,
      lastName: quote.teacher.lastName,
      email: quote.teacher.email,
      phoneNumber: quote.teacher.phoneNumber,
      dateOfBirth: new Date(quote.teacher.dateOfBirth)
      // hourlyRates likely not needed here
    });

    // Use object pattern for LessonQuote
    return new LessonQuote({
      id: quote.id,
      lessonRequest,
      teacher,
      costInCents: quote.costInCents,
      hourlyRateInCents: quote.hourlyRateInCents,
      createdAt: new Date(quote.createdAt)
    });
  });
};

// Function to fetch quotes for a specific teacher
export const fetchQuotesForTeacher = async (teacherId: string): Promise<LessonQuote[]> => {
  try {
    const response = await apiClient.get(`/api/v1/teachers/${teacherId}/quotes`);
    // Use the transformer function
    return transformQuotes(response.data);
  } catch (error) {
    console.error('Error fetching quotes for teacher:', error);
    throw error;
  }
}; 