/**
 * Model representing the hourly rate a teacher charges for a specific lesson type
 * Maps to the "TeacherLessonHourlyRate" table in the database
 */
export class TeacherLessonHourlyRate {
  id: string;
  teacherId: string;
  type: string; // Maps to "type" column, using string to avoid import issues, will be one of LessonType enum values
  rateInCents: number; // Rate stored in cents (e.g., $45.50 = 4550 cents)
  createdAt?: Date;
  updatedAt?: Date;
  deactivatedAt?: Date; // When null, the rate is active; when set, the rate is deactivated

  constructor(
    id: string,
    teacherId: string,
    type: string,
    rateInCents: number,
    createdAt?: Date,
    updatedAt?: Date,
    deactivatedAt?: Date
  ) {
    this.id = id;
    this.teacherId = teacherId;
    this.type = type;
    this.rateInCents = rateInCents;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deactivatedAt = deactivatedAt;
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
    return this.deactivatedAt === null || this.deactivatedAt === undefined;
  }

  /**
   * Calculate the cost for a lesson of a given duration
   * @param durationMinutes Duration of the lesson in minutes
   * @returns Cost in cents
   */
  calculateCostForDuration(durationMinutes: number): number {
    return Math.round((this.rateInCents * durationMinutes) / 60);
  }
} 