import { LessonType } from '@shared/models/LessonType';

export { LessonType };

// Interface for address data
export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface for student data
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

// Interface for lesson request data
export interface LessonRequest {
  id: string;
  type: LessonType;
  durationMinutes: number;
  startTime: string;
  addressId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  address: Address;
}

// Interface for teacher data
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  lessonsCompleted: number;
  lessonHourlyRates: Record<string, number>;
}

// Interface for lesson quote data
export interface LessonQuote {
  id: string;
  lessonRequest: LessonRequest;
  teacher: Teacher;
  costInCents: number;
  hourlyRateInCents: number;
  expiresAt: string;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REJECTED';
}

// Interface for confirmed lesson data
export interface Lesson {
  id: string;
  lessonRequest: LessonRequest;
  teacher: Teacher;
  quote: LessonQuote;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
} 