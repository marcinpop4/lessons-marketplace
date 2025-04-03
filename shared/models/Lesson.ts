import { LessonQuote } from './LessonQuote.js';

/**
 * Lesson model representing a confirmed music lesson
 * This is created after a student accepts a quote from a teacher
 */
export class Lesson {
  id: string;
  quote: LessonQuote;
  confirmedAt: Date;

  constructor(
    id: string,
    quote: LessonQuote,
    confirmedAt: Date = new Date()
  ) {
    this.id = id;
    this.quote = quote;
    this.confirmedAt = confirmedAt;
  }

  /**
   * Create a Lesson from a LessonQuote
   * @param id Unique identifier for the lesson
   * @param quote The accepted lesson quote
   * @returns A new Lesson instance
   */
  static createFromQuote(id: string, quote: LessonQuote): Lesson {
    if (!quote.isValid()) {
      throw new Error('Cannot create a lesson from an expired quote');
    }
    return new Lesson(id, quote);
  }

  /**
   * Get the lesson type from the quote
   */
  get type() {
    return this.quote.lessonRequest.type;
  }

  /**
   * Get the start time from the quote
   */
  get startTime() {
    return this.quote.lessonRequest.startTime;
  }

  /**
   * Get the duration in minutes from the quote
   */
  get durationMinutes() {
    return this.quote.lessonRequest.durationMinutes;
  }

  /**
   * Get the address from the quote
   */
  get address() {
    return this.quote.lessonRequest.address;
  }

  /**
   * Get the teacher from the quote
   */
  get teacher() {
    return this.quote.teacher;
  }

  /**
   * Get the student from the quote
   */
  get student() {
    return this.quote.lessonRequest.student;
  }

  /**
   * Get the cost in cents from the quote
   */
  get costInCents() {
    return this.quote.costInCents;
  }

  /**
   * Calculate the end time of the lesson based on start time and duration
   */
  get endTime(): Date {
    const end = new Date(this.startTime);
    end.setMinutes(end.getMinutes() + this.durationMinutes);
    return end;
  }

  /**
   * Format the cost as a currency string
   * Note: This should only be used in client-side code for display purposes
   * @param locale The locale to use for formatting (defaults to en-US)
   * @param currency The currency code to use (defaults to USD)
   * @returns Formatted currency string
   */
  getFormattedCost(locale = 'en-US', currency = 'USD'): string {
    return this.quote.getFormattedCost(locale, currency);
  }
} 