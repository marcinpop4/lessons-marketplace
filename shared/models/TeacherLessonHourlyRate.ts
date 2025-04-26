/**
 * Model representing the hourly rate a teacher charges for a specific lesson type
 * Maps to the "TeacherLessonHourlyRate" table in the database
 */

// Remove Prisma type import
// import type { TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';
import { LessonType } from './LessonType.js'; // Keep shared enum import if needed (e.g., for type property)

/**
 * Properties required to create a TeacherLessonHourlyRate instance.
 */
interface TeacherLessonHourlyRateProps {
  id: string;
  teacherId: string;
  type: LessonType; // Use shared enum directly
  rateInCents: number;
  // Allow null to represent an active rate explicitly, alongside undefined for cases where it might not be set
  deactivatedAt?: Date | null | undefined;
  createdAt?: Date; // Optional, defaults to new Date()
  updatedAt?: Date; // Add updatedAt if it should be part of the model
}

/**
 * Represents an hourly rate set by a teacher for a specific lesson type.
 * Tracks activation/deactivation history implicitly via deactivatedAt.
 */
export class TeacherLessonHourlyRate {
  id: string;
  teacherId: string;
  type: LessonType; // Use shared enum
  rateInCents: number; // Rate stored in cents (e.g., $45.50 = 4550 cents)
  createdAt: Date;
  updatedAt?: Date; // Include if managed by the model/mapper
  // Allow null to represent an active rate explicitly, alongside undefined
  deactivatedAt?: Date | null | undefined;

  // Updated constructor using object destructuring
  constructor({
    id,
    teacherId,
    type,
    rateInCents,
    // Default to null, explicitly indicating an active rate
    deactivatedAt = null,
    createdAt = new Date(), // Default value for optional prop
    updatedAt // Add updatedAt to constructor if needed
  }: TeacherLessonHourlyRateProps) {
    this.id = id;
    this.teacherId = teacherId;
    this.type = type;
    this.rateInCents = rateInCents;
    this.createdAt = createdAt;
    this.deactivatedAt = deactivatedAt;
    this.updatedAt = updatedAt; // Assign if included
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
    // Active if deactivatedAt is explicitly null (or undefined, though null is the expected 'active' state now)
    return this.deactivatedAt === null || this.deactivatedAt === undefined;
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