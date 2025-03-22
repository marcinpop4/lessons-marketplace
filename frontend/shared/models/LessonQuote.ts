import { LessonRequest } from './LessonRequest.js';
import { Teacher } from './Teacher.js';
import { centsToDisplayDollars } from '../types/CurrencyTypes.js';

/**
 * LessonQuote model representing a teacher's quote for a specific lesson request
 * This is created after a student submits a lesson request and before a lesson is booked
 */
export class LessonQuote {
  id: string;
  lessonRequest: LessonRequest;
  teacher: Teacher;
  costInCents: number;
  createdAt: Date;
  expiresAt: Date; // Quotes can expire after a certain time period
  
  constructor(
    id: string,
    lessonRequest: LessonRequest,
    teacher: Teacher,
    costInCents: number,
    createdAt: Date = new Date(),
    expiresAt: Date
  ) {
    this.id = id;
    this.lessonRequest = lessonRequest;
    this.teacher = teacher;
    this.costInCents = costInCents;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  /**
   * Create a LessonQuote from a LessonRequest and a Teacher
   * Automatically calculates the cost based on teacher's hourly rate
   * @param id Unique identifier for the quote
   * @param lessonRequest The lesson request
   * @param teacher The teacher providing the quote
   * @param expiresAt When the quote expires
   * @returns A new LessonQuote instance
   */
  static createFromRequest(
    id: string,
    lessonRequest: LessonRequest,
    teacher: Teacher,
    expiresAt: Date
  ): LessonQuote {
    const hourlyRate = teacher.getHourlyRate(lessonRequest.type);
    
    if (!hourlyRate) {
      throw new Error(`Teacher does not offer lessons of type: ${lessonRequest.type}`);
    }
    
    const costInCents = Math.round(
      (hourlyRate.rateInCents * lessonRequest.durationMinutes) / 60
    );
    
    return new LessonQuote(id, lessonRequest, teacher, costInCents, new Date(), expiresAt);
  }

  /**
   * Calculate the hourly rate in cents based on the lesson duration and cost
   * @returns The hourly rate in cents
   */
  getHourlyRateInCents(): number {
    return Math.round(this.costInCents * 60 / this.lessonRequest.durationMinutes);
  }

  /**
   * Format the hourly rate as a currency string
   * @returns Formatted currency string with /hour suffix
   */
  getFormattedHourlyRate(): string {
    const hourlyRateInDollars = centsToDisplayDollars(this.getHourlyRateInCents());
    return `$${hourlyRateInDollars.toFixed(2)}/hour`;
  }

  /**
   * Format the lesson price as a currency string
   * @returns Formatted currency string
   */
  getFormattedLessonPrice(): string {
    const priceInDollars = centsToDisplayDollars(this.costInCents);
    return `$${priceInDollars.toFixed(2)}`;
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

  /**
   * Check if the quote is still valid (not expired)
   * @returns Boolean indicating if the quote is still valid
   */
  isValid(): boolean {
    return new Date() < this.expiresAt;
  }

  /**
   * Expire this quote immediately
   */
  expire(): void {
    this.expiresAt = new Date();
  }
} 