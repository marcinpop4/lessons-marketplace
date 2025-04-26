import { LessonRequest } from './LessonRequest.js';
import { Teacher } from './Teacher.js';
import { centsToDisplayDollars } from '../types/CurrencyTypes.js';
import { LessonType } from './LessonType.js';
import { LessonQuoteStatus, LessonQuoteStatusValue } from './LessonQuoteStatus.js';

/**
 * Properties required to create a LessonQuote instance.
 */
interface LessonQuoteProps {
  id: string;
  lessonRequest: LessonRequest;
  teacher: Teacher;
  costInCents: number;
  hourlyRateInCents: number;
  currentStatusId: string | null;
  currentStatus: LessonQuoteStatus | null;
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
  currentStatusId: string | null;
  currentStatus: LessonQuoteStatus | null;
  createdAt?: Date;
  updatedAt?: Date;

  // Updated constructor using object destructuring
  constructor({
    id,
    lessonRequest,
    teacher,
    costInCents,
    hourlyRateInCents,
    currentStatusId,
    currentStatus,
    createdAt,
    updatedAt,
  }: LessonQuoteProps) {
    this.id = id;
    this.lessonRequest = lessonRequest;
    this.teacher = teacher;
    this.costInCents = costInCents;
    this.hourlyRateInCents = hourlyRateInCents;
    this.currentStatusId = currentStatusId;

    if (!currentStatus || !(currentStatus instanceof LessonQuoteStatus)) {
      console.warn(`LessonQuote constructor (id: ${id}) received invalid currentStatus prop`, currentStatus);
      this.currentStatus = new LessonQuoteStatus({
        id: currentStatusId || 'unknown',
        lessonQuoteId: id,
        status: LessonQuoteStatusValue.CREATED,
        createdAt: createdAt || new Date()
      });
      if (this.currentStatus.id === 'unknown') this.currentStatusId = null;
      else this.currentStatusId = this.currentStatus.id;

    } else {
      this.currentStatus = currentStatus;
    }

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
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