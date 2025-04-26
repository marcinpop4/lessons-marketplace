/**
 * Model representing the hourly rate a teacher charges for a specific lesson type
 * Maps to the "TeacherLessonHourlyRate" table in the database
 */

// Remove Prisma type import
// import type { TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';
import { LessonType } from './LessonType.js'; // Keep shared enum import if needed (e.g., for type property)
// Import the new status model and value enum
import { TeacherLessonHourlyRateStatus, TeacherLessonHourlyRateStatusValue } from './TeacherLessonHourlyRateStatus.js';

/**
 * Properties required to create a TeacherLessonHourlyRate instance.
 */
interface TeacherLessonHourlyRateProps {
  id: string;
  teacherId: string;
  type: LessonType; // Use shared enum directly
  rateInCents: number;
  // Remove deactivatedAt from props
  // deactivatedAt?: Date | null | undefined;
  createdAt?: Date; // Optional, defaults to new Date()
  updatedAt?: Date; // Add updatedAt if it should be part of the model
  // Add status-related props (optional for constructor, required for full obj)
  currentStatusId?: string | null;
  currentStatus?: TeacherLessonHourlyRateStatus | null;
}

/**
 * Represents an hourly rate set by a teacher for a specific lesson type.
 * Now uses the standard status model for activation state.
 */
export class TeacherLessonHourlyRate {
  id: string;
  teacherId: string;
  type: LessonType; // Use shared enum
  rateInCents: number; // Rate stored in cents (e.g., $45.50 = 4550 cents)
  createdAt: Date;
  updatedAt?: Date; // Include if managed by the model/mapper
  // Remove deactivatedAt field
  // deactivatedAt?: Date | null | undefined;

  // Add standard status fields
  currentStatusId: string | null; // FK to the current status record
  currentStatus: TeacherLessonHourlyRateStatus | null; // Populated relation object

  // Updated constructor using object destructuring
  constructor({
    id,
    teacherId,
    type,
    rateInCents,
    createdAt = new Date(), // Default value for optional prop
    updatedAt,
    // Initialize status fields to null by default in constructor
    currentStatusId = null,
    currentStatus = null,
  }: TeacherLessonHourlyRateProps) {
    this.id = id;
    this.teacherId = teacherId;
    this.type = type;
    this.rateInCents = rateInCents;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt; // Assign if included
    this.currentStatusId = currentStatusId;
    this.currentStatus = currentStatus;
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
   * Check if the hourly rate is active based on its current status.
   * @returns Boolean indicating if the rate is active.
   */
  isActive(): boolean {
    // Active if currentStatus exists and its status is ACTIVE
    return this.currentStatus?.status === TeacherLessonHourlyRateStatusValue.ACTIVE;
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