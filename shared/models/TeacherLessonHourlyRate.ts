/**
 * Model representing the hourly rate a teacher charges for a specific lesson type
 * Maps to the "TeacherLessonHourlyRate" table in the database
 */

// Import Prisma type
import type { TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';

/**
 * Properties required to create a TeacherLessonHourlyRate instance.
 */
interface TeacherLessonHourlyRateProps {
  id: string;
  teacherId: string;
  type: string; // TODO: Should use LessonType enum if possible
  rateInCents: number;
  deactivatedAt?: Date | undefined; // Optional
  createdAt?: Date; // Optional, defaults to new Date()
}

/**
 * Represents an hourly rate set by a teacher for a specific lesson type.
 * Tracks activation/deactivation history implicitly via deactivatedAt.
 */
export class TeacherLessonHourlyRate {
  id: string;
  teacherId: string;
  type: string; // Maps to "type" column, using string to avoid import issues, will be one of LessonType enum values
  rateInCents: number; // Rate stored in cents (e.g., $45.50 = 4550 cents)
  createdAt: Date;
  updatedAt?: Date;
  deactivatedAt?: Date | undefined; // Optional field

  // Updated constructor using object destructuring
  constructor({
    id,
    teacherId,
    type,
    rateInCents,
    deactivatedAt = undefined, // Default value for optional prop
    createdAt = new Date() // Default value for optional prop
  }: TeacherLessonHourlyRateProps) {
    this.id = id;
    this.teacherId = teacherId;
    this.type = type;
    this.rateInCents = rateInCents;
    this.createdAt = createdAt;
    this.deactivatedAt = deactivatedAt;
  }

  /**
   * Static factory method to create a TeacherLessonHourlyRate instance from a Prisma object.
   * @param dbRate The plain object returned by Prisma.
   * @returns A new instance of the shared TeacherLessonHourlyRate model.
   */
  public static fromDb(dbRate: DbTeacherLessonHourlyRate): TeacherLessonHourlyRate {
    const { createdAt, updatedAt, ...rateProps } = dbRate;
    // Construct the shared model instance
    return new TeacherLessonHourlyRate({
      ...rateProps, // Includes id, teacherId, type, rateInCents
      // Pass optional fields explicitly, allowing constructor defaults if null/undefined
      createdAt: createdAt ?? undefined,
      deactivatedAt: dbRate.deactivatedAt ?? undefined
      // Note: shared model doesn't have updatedAt in constructor props
    });
  }

  /**
   * Gets the rate in dollars (converted from cents)
   * @returns Rate in dollars as a floating point number
   */
  get rateInDollars(): number {
    return this.rateInCents / 100;
  }

  /**
   * Formats the hourly rate as a currency string
   * @param locale The locale to use for formatting (defaults to en-US)
   * @param currency The currency code to use (defaults to USD)
   * @returns Formatted currency string
   */
  getFormattedRate(locale = 'en-US', currency = 'USD'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(this.rateInDollars);
  }

  /**
   * Check if the hourly rate is active (not deactivated)
   * @returns Boolean indicating if the rate is active
   */
  isActive(): boolean {
    return this.deactivatedAt === undefined || this.deactivatedAt === null;
  }

  /**
   * Calculate the cost for a lesson of a given duration
   * @param durationMinutes Duration of the lesson in minutes
   * @returns Cost in cents
   */
  calculateCostForDuration(durationMinutes: number): number {
    if (durationMinutes <= 0) {
      return 0;
    }
    // Ensure calculation uses floating point before rounding at the end
    return Math.round((this.rateInCents * durationMinutes) / 60.0);
  }
} 