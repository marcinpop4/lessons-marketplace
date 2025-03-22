// Enum for lesson types
export enum LessonType {
  VOICE = 'VOICE',
  GUITAR = 'GUITAR',
  BASS = 'BASS',
  DRUMS = 'DRUMS'
}

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
  id?: string;
  type: LessonType;
  startTime: string; // ISO string format
  durationMinutes: number;
  address: Address; // Now required and renamed from addressObj
  studentId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface for teacher data
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  experience?: number;
  bio?: string;
  specialties?: string[];
  lessonHourlyRates: Record<LessonType, number>;
}

// Interface for lesson quote data
export interface LessonQuote {
  id?: string;
  costInCents: number;
  expiresAt: string;
  lessonRequestId: string;
  teacherId: string;
  createdAt?: string;
  updatedAt?: string;
  teacher?: Teacher;
  lessonRequest?: LessonRequest;
  expired?: boolean;
  getFormattedHourlyRate(): string;
  getFormattedLessonPrice(): string;
}

// Interface for confirmed lesson data
export interface Lesson {
  id?: string;
  confirmedAt: string;
  quoteId: string;
  createdAt?: string;
  updatedAt?: string;
} 