import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonType } from '@shared/models/LessonType';
import { Address } from '@shared/models/Address';
import { LessonQuote } from '@shared/models/LessonQuote';
import apiClient from './apiClient';

export interface CreateLessonRequestPayload {
  type: LessonType;
  startTime: Date;
  durationMinutes: number;
  addressObj: Address;
  studentId: string;
}

export interface CreateLessonRequestResponse {
  lessonRequest: LessonRequest;
  quotes: LessonQuote[];
}

interface ApiResponseData {
  id: string;
  type: LessonType;
  startTime: string;
  durationMinutes: number;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  student: any;
}

interface ApiQuoteData {
  id: string;
  teacher: any;
  costInCents: number;
  createdAt: string;
  expiresAt: string;
  hourlyRateInCents: number;
}

/**
 * Create a new lesson request
 * @param data - Lesson request data
 * @returns Created lesson request and quotes
 */
export const createLessonRequest = async (data: CreateLessonRequestPayload): Promise<CreateLessonRequestResponse> => {
  try {
    // Ensure startTime is a valid Date object
    if (!(data.startTime instanceof Date) || isNaN(data.startTime.getTime())) {
      throw new Error('Invalid date provided for startTime');
    }

    // Prepare the payload with proper date serialization
    const payload = {
      ...data,
      startTime: data.startTime.toISOString()
    };

    console.log('Sending lesson request data:', payload);
    const response = await apiClient.post('/api/v1/lesson-requests', payload);

    const { lessonRequest: responseData, quotes } = response.data as { lessonRequest: ApiResponseData; quotes: ApiQuoteData[] };

    // Ensure proper date instantiation
    const lessonRequest = new LessonRequest(
      responseData.id,
      responseData.type,
      new Date(responseData.startTime),
      responseData.durationMinutes,
      new Address(
        responseData.address.street,
        responseData.address.city,
        responseData.address.state,
        responseData.address.postalCode,
        responseData.address.country
      ),
      responseData.student
    );

    // Transform quotes
    const transformedQuotes = quotes.map(quote => new LessonQuote(
      quote.id,
      lessonRequest,
      quote.teacher,
      quote.costInCents,
      quote.hourlyRateInCents,
      new Date(quote.createdAt),
      new Date(quote.expiresAt)
    ));

    return {
      lessonRequest,
      quotes: transformedQuotes
    };
  } catch (error) {
    console.error('Error creating lesson request:', error);
    throw error;
  }
};

/**
 * Get a lesson request by ID
 * @param id - Lesson request ID
 * @returns Lesson request
 */
export const getLessonRequestById = async (id: string): Promise<LessonRequest> => {
  try {
    const response = await apiClient.get(`/api/v1/lesson-requests/${id}`);
    const responseData = response.data as ApiResponseData;

    // Ensure proper date instantiation
    return new LessonRequest(
      responseData.id,
      responseData.type,
      new Date(responseData.startTime),
      responseData.durationMinutes,
      new Address(
        responseData.address.street,
        responseData.address.city,
        responseData.address.state,
        responseData.address.postalCode,
        responseData.address.country
      ),
      responseData.student
    );
  } catch (error) {
    console.error('Error fetching lesson request:', error);
    throw error;
  }
};

/**
 * Get all lesson requests for a student
 * @param studentId - Student ID
 * @returns Array of lesson requests
 */
export const getLessonRequestsByStudent = async (studentId: string): Promise<LessonRequest[]> => {
  try {
    const response = await apiClient.get(`/api/v1/lesson-requests/student/${studentId}`);
    const responseData = response.data as ApiResponseData[];

    return responseData.map(data => new LessonRequest(
      data.id,
      data.type,
      new Date(data.startTime),
      data.durationMinutes,
      new Address(
        data.address.street,
        data.address.city,
        data.address.state,
        data.address.postalCode,
        data.address.country
      ),
      data.student
    ));
  } catch (error) {
    console.error('Error fetching student lesson requests:', error);
    throw error;
  }
}; 