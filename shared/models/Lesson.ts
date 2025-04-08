import { LessonQuote } from './LessonQuote.js';
import { LessonStatus, LessonStatusValue } from './LessonStatus.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Lesson model representing a confirmed music lesson
 * This is created after a student accepts a quote from a teacher
 */
export class Lesson {
  id: string;
  quote: LessonQuote;
  /**
   * @deprecated Use lesson status tracking instead. This field will be removed in a future version.
   * The confirmation status should be tracked through LessonStatus records.
   */
  confirmedAt: Date;
  currentStatusId: string | null;

  constructor(
    id: string,
    quote: LessonQuote,
    confirmedAt: Date = new Date(),
    currentStatusId: string | null = null
  ) {
    this.id = id;
    this.quote = quote;
    this.confirmedAt = confirmedAt;
    this.currentStatusId = currentStatusId;
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

  /**
   * Update the lesson's status by creating a new status record
   * @param prisma Prisma client instance
   * @param statusId Unique identifier for the new status record
   * @param status The new status value
   * @param context Additional context about the status change
   * @returns The updated Lesson instance
   */
  async updateStatus(
    prisma: PrismaClient,
    statusId: string,
    status: LessonStatusValue,
    context: Record<string, unknown> = {}
  ): Promise<Lesson> {
    // Use any casting to bypass TypeScript errors
    // This is a temporary solution until the TypeScript/Prisma compatibility issue is resolved
    const client = prisma as any;

    // Use transaction to ensure both operations succeed or fail together
    await client.$transaction([
      // Create the new status record
      client.lessonStatus.create({
        data: {
          id: statusId,
          lessonId: this.id,
          status: status,
          context: context,
          createdAt: new Date()
        }
      }),

      // Update the lesson to reference the new status
      client.lesson.update({
        where: { id: this.id },
        data: {
          currentStatusId: statusId
        }
      })
    ]);

    this.currentStatusId = statusId;
    return this;
  }
} 