import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonType } from '@shared/models/LessonType';
import { Address } from '@shared/models/Address';
import { LessonQuote } from '@shared/models/LessonQuote';
import apiClient from './apiClient';
import { LessonQuoteStatus, LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';
import logger from '../utils/logger';

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
  currentStatus?: {
    id: string;
    status: string;
    context?: any;
    createdAt?: string;
  } | null;
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

    const response = await apiClient.post('/api/v1/lesson-requests', payload);

    // Backend returns the lessonRequest object directly
    const responseData = response.data as ApiResponseData;
    // const { lessonRequest: responseData, quotes } = response.data as { lessonRequest: ApiResponseData; quotes: ApiQuoteData[] };

    // Ensure proper date instantiation
    const lessonRequest = new LessonRequest({
      id: responseData.id,
      type: responseData.type,
      startTime: new Date(responseData.startTime),
      durationMinutes: responseData.durationMinutes,
      address: new Address({
        street: responseData.address.street,
        city: responseData.address.city,
        state: responseData.address.state,
        postalCode: responseData.address.postalCode,
        country: responseData.address.country
      }),
      student: responseData.student
    });

    // Since quotes are not returned by this endpoint anymore, remove quote transformation
    // const transformedQuotes = quotes.map(quote => { ... });

    return {
      lessonRequest,
      // Return empty array for quotes as they are not part of the response
      quotes: []
    };
  } catch (error) {
    logger.error('Error creating lesson request', { error });
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
    return new LessonRequest({
      id: responseData.id,
      type: responseData.type,
      startTime: new Date(responseData.startTime),
      durationMinutes: responseData.durationMinutes,
      address: new Address({
        street: responseData.address.street,
        city: responseData.address.city,
        state: responseData.address.state,
        postalCode: responseData.address.postalCode,
        country: responseData.address.country
      }),
      student: responseData.student
    });
  } catch (error) {
    logger.error('Error fetching lesson request', { error });
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

    return responseData.map(data => new LessonRequest({
      id: data.id,
      type: data.type,
      startTime: new Date(data.startTime),
      durationMinutes: data.durationMinutes,
      address: new Address({
        street: data.address.street,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode,
        country: data.address.country
      }),
      student: data.student
    }));
  } catch (error) {
    logger.error('Error fetching student lesson requests', { error });
    throw error;
  }
}; 