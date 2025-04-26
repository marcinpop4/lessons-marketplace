import { LessonRequest } from './LessonRequest.js';
import { Teacher } from './Teacher.js';
import { centsToDisplayDollars } from '../types/CurrencyTypes.js';
import { LessonType } from './LessonType.js';

/**
 * Properties required to create a LessonQuote instance.
 */
interface LessonQuoteProps {
  id: string;
  lessonRequest: LessonRequest;
  teacher: Teacher;
  costInCents: number;
  hourlyRateInCents: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * LessonQuote model representing a teacher's quote for a specific lesson request
 * This is created after a student submits a lesson request and before a lesson is booked
 */
export class LessonQuote {
  id: string;
  lessonRequest: LessonRequest;
  teacher: Teacher;
  costInCents: number;
  hourlyRateInCents: number;
  createdAt?: Date;
  updatedAt?: Date;

  // Updated constructor using object destructuring
  constructor({
    id,
    lessonRequest,
    teacher,
    costInCents,
    hourlyRateInCents,
    createdAt,
    updatedAt,
  }: LessonQuoteProps) {
    this.id = id;
    this.lessonRequest = lessonRequest;
    this.teacher = teacher;
    this.costInCents = costInCents;
    this.hourlyRateInCents = hourlyRateInCents;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Create a LessonQuote from a LessonRequest and a Teacher
   * Automatically calculates the cost based on teacher's hourly rate
   * @param id Unique identifier for the quote
   * @param lessonRequest The lesson request
   * @param teacher The teacher providing the quote
   * @returns A new LessonQuote instance
   */
  static createFromRequest(
    id: string,
    lessonRequest: LessonRequest,
    teacher: Teacher,
  ): LessonQuote {
    const hourlyRate = teacher.getHourlyRate(lessonRequest.type);

    if (!hourlyRate) {
      throw new Error(`Teacher does not offer lessons of type: ${lessonRequest.type}`);
    }

    const costInCents = Math.round(
      (hourlyRate.rateInCents * lessonRequest.durationMinutes) / 60
    );

    // Use the new constructor pattern
    return new LessonQuote({
      id,
      lessonRequest,
      teacher,
      costInCents,
      hourlyRateInCents: hourlyRate.rateInCents,
      // createdAt uses default
      updatedAt: new Date(), // updatedAt uses default
    });
  }

  /**
   * Format the cost as a currency string
   * Note: This should only be used in client-side code for display purposes
   * @param locale The locale to use for formatting (defaults to en-US)
   * @param currency The currency code to use (defaults to USD)
   * @returns Formatted currency string
   */
  getFormattedCost(locale = 'en-US', currency = 'USD'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(centsToDisplayDollars(this.costInCents));
  }
} 