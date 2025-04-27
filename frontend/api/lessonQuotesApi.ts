import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { Teacher } from '@shared/models/Teacher';
import { Student } from '@shared/models/Student';
import { Address } from '@shared/models/Address';
import { LessonType } from '@shared/models/LessonType';
import apiClient from './apiClient';
import { LessonQuoteStatus, LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';

// --- Interfaces (Moved from teacherQuoteApi) ---
export interface TeacherWithRates extends Teacher {
  lessonHourlyRates: {
    [key in LessonType]?: number;
  };
}

interface ApiQuoteData {
  id: string;
  costInCents: number;
  hourlyRateInCents: number;
  createdAt: string;
  lessonRequest: any;
  teacher: any;
  currentStatus?: {
    id: string;
    status: string;
    context?: any;
    createdAt?: string;
  } | null;
}

// --- Helper Functions (Moved from teacherQuoteApi) ---

/**
 * Transforms raw API quote data into LessonQuote domain models.
 * @param quotesData Raw data array from the API.
 * @returns Array of LessonQuote instances.
 */
const transformQuotes = (quotesData: ApiQuoteData[]): LessonQuote[] => {
  if (!Array.isArray(quotesData)) {
    console.error("transformQuotes expected an array, but received:", quotesData);
    return []; // Return empty array or throw error based on desired handling
  }
  return quotesData.map((quote: ApiQuoteData) => {
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
    });

    const quoteStatusData = quote.currentStatus;
    const quoteCurrentStatusModel = quoteStatusData
      ? new LessonQuoteStatus({
        id: quoteStatusData.id,
        lessonQuoteId: quote.id,
        status: quoteStatusData.status as LessonQuoteStatusValue,
        context: quoteStatusData.context || null,
        createdAt: quoteStatusData.createdAt ? new Date(quoteStatusData.createdAt) : new Date()
      })
      : null;

    return new LessonQuote({
      id: quote.id,
      lessonRequest,
      teacher,
      costInCents: quote.costInCents,
      hourlyRateInCents: quote.hourlyRateInCents,
      currentStatus: quoteCurrentStatusModel,
      currentStatusId: quoteCurrentStatusModel?.id ?? null,
      createdAt: new Date(quote.createdAt)
    });
  });
};


// --- API Functions ---

/**
 * Get quotes for a specific lesson request.
 * @param lessonRequestId - Lesson request ID.
 * @returns Array of lesson quotes.
 */
export const getLessonQuotesByRequestId = async (lessonRequestId: string): Promise<LessonQuote[]> => {
  const response = await apiClient.get(`/api/v1/lesson-quotes?lessonRequestId=${lessonRequestId}`);
  return transformQuotes(response.data); // Use helper function
};

/**
 * Get quotes for a specific teacher.
 * @param teacherId - Teacher ID.
 * @returns Array of lesson quotes.
 */
export const fetchQuotesForTeacher = async (teacherId: string): Promise<LessonQuote[]> => {
  try {
    const response = await apiClient.get(`/api/v1/teachers/${teacherId}/quotes`);
    return transformQuotes(response.data);
  } catch (error) {
    console.error('Error fetching quotes for teacher:', error);
    throw error;
  }
};

/**
 * Get available teachers for a specific lesson type.
 * @param lessonType - Type of lesson.
 * @param limit - Maximum number of teachers to return (default: 5).
 * @returns Array of teachers (consider adding mapping if API doesn't return Teacher model directly).
 */
export const getAvailableTeachers = async (
  lessonType: LessonType,
  limit: number = 5
): Promise<Teacher[]> => {
  // Assuming API returns data compatible with Teacher model or needs mapping
  const response = await apiClient.get(`/api/v1/teachers/available?lessonType=${lessonType}&limit=${limit}`);
  // TODO: Add mapping logic here if necessary to convert raw data to Teacher instances
  return response.data;
};

/**
 * Create lesson quotes for a specific lesson request.
 * The backend will generate quotes for available teachers unless specific ones are provided (not supported by this frontend function version).
 * @param lessonRequestId - Lesson request ID.
 * @returns Array of created LessonQuote instances.
 */
export const createLessonQuotesForRequest = async (
  lessonRequestId: string
): Promise<LessonQuote[]> => {
  try {
    // Call the POST endpoint with only the lessonRequestId
    const response = await apiClient.post('/api/v1/lesson-quotes', {
      lessonRequestId // Only send the request ID
    });
    // Use the transformer function to map the response data
    return transformQuotes(response.data);
  } catch (error) {
    console.error(`Error creating lesson quotes for request ${lessonRequestId}:`, error);
    // Consider more specific error handling or re-throwing
    throw error;
  }
};

/**
 * Accept a lesson quote.
 * This triggers backend logic to create a lesson.
 * @param quoteId - Lesson quote ID.
 * @returns Object indicating success and potentially the created lesson ID (adjust based on actual API response).
 */
export const acceptLessonQuote = async (quoteId: string): Promise<{ id: string; lesson: { id: string } }> => {
  // This endpoint might need adjustment based on API changes.
  // Original endpoint was /api/v1/lesson-quotes/${quoteId}/accept
  // Updated endpoint uses PATCH /api/v1/lesson-quotes/{quoteId} with status: ACCEPTED
  // Re-implementing based on the PATCH route standard:
  try {
    const response = await apiClient.patch(`/api/v1/lesson-quotes/${quoteId}`, {
      status: LessonQuoteStatusValue.ACCEPTED
      // Context could be added here if needed: context: { reason: 'Student accepted' }
    });
    // Assuming the PATCH returns the updated LessonQuote object
    // We need to map it, but the API might not return the lesson ID directly here.
    // The return type Promise<{ id: string; lesson: { id: string } }> might be incorrect now.
    // Let's return the updated quote for now.
    const updatedQuoteData = [response.data]; // Wrap in array for transformQuotes
    const mappedQuotes = transformQuotes(updatedQuoteData);
    // If the API *does* return lesson info alongside the quote, adjust transformQuotes or handle here.
    // For now, just returning the quote. Caller might need separate call to get lesson details if needed.
    // Consider adjusting return type to Promise<LessonQuote>
    return mappedQuotes[0] as any; // Returning mapped quote, cast to 'any' to bypass old return type temporarily
  } catch (error) {
    console.error(`Error accepting lesson quote ${quoteId}:`, error);
    throw error;
  }
}; 