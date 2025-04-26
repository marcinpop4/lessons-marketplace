import { Person } from './Person.js';
import { TeacherLessonHourlyRate } from './TeacherLessonHourlyRate.js';
import { LessonType } from './LessonType.js'; // Import LessonType if needed for methods

// REMOVE Prisma imports
// import type { Teacher as DbTeacher, TeacherLessonHourlyRate as DbTeacherLessonHourlyRate } from '@prisma/client';

// Interface for Teacher constructor properties, extending PersonProps
interface TeacherProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  hourlyRates?: TeacherLessonHourlyRate[]; // Optional, defaults to []
  // Add createdAt/updatedAt if they should be part of the shared model
  // createdAt?: Date;
  // updatedAt?: Date;
}

/**
 * Teacher model representing instructors who offer music lessons
 * Extends the base Person model and adds teaching-specific properties
 */
export class Teacher extends Person {
  // Collection of hourly rates by lesson type
  hourlyRates: TeacherLessonHourlyRate[];
  // Add createdAt/updatedAt properties if defined in TeacherProps
  // createdAt?: Date;
  // updatedAt?: Date;

  // Updated constructor using object destructuring
  constructor({
    id,
    firstName,
    lastName,
    email,
    phoneNumber,
    dateOfBirth,
    hourlyRates = [], // Default value for optional prop
    // createdAt,
    // updatedAt
  }: TeacherProps) {
    // Call super with the relevant part of the object
    super({ id, firstName, lastName, email, phoneNumber, dateOfBirth });
    this.hourlyRates = hourlyRates;
    // Assign createdAt/updatedAt if needed
    // this.createdAt = createdAt;
    // this.updatedAt = updatedAt;
  }

  // REMOVE fromDb static method
  // public static fromDb(...) {
  //   ...
  // }

  /**
   * Adds a new hourly rate for a specific lesson type
   * @param hourlyRate The hourly rate object to add
   */
  addHourlyRate(hourlyRate: TeacherLessonHourlyRate): void {
    // Remove any existing rate for this lesson type
    this.hourlyRates = this.hourlyRates.filter(
      rate => rate.type !== hourlyRate.type
    );
    // Add the new rate
    this.hourlyRates.push(hourlyRate);
  }

  /**
   * Gets the hourly rate for a specific lesson type
   * @param lessonType The type of lesson
   * @returns The hourly rate object or undefined if not set
   */
  getHourlyRate(lessonType: LessonType): TeacherLessonHourlyRate | undefined {
    return this.hourlyRates.find(rate => rate.type === lessonType && rate.isActive());
  }

  /**
   * Gets all hourly rates (both active and inactive)
   * @returns Array of all hourly rates
   */
  getAllHourlyRates(): TeacherLessonHourlyRate[] {
    return this.hourlyRates;
  }

  /**
   * Gets only active hourly rates (where deactivatedAt is null)
   * @returns Array of active hourly rates
   */
  getActiveHourlyRates(): TeacherLessonHourlyRate[] {
    return this.hourlyRates.filter(rate => rate.isActive());
  }

  /**
   * Deactivates an hourly rate for a specific lesson type
   * @param lessonType The type of lesson to deactivate
   * @returns True if the rate was found and deactivated, false otherwise
   */
  deactivateHourlyRate(lessonType: LessonType): boolean {
    const rate = this.hourlyRates.find(rate => rate.type === lessonType);
    if (rate) {
      rate.deactivatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Reactivates a previously deactivated hourly rate
   * @param lessonType The type of lesson to reactivate
   * @returns True if the rate was found and reactivated, false otherwise
   */
  reactivateHourlyRate(lessonType: LessonType): boolean {
    const rate = this.hourlyRates.find(rate => rate.type === lessonType);
    if (rate) {
      rate.deactivatedAt = undefined; // Or set to null if that's the preferred 'active' state
      return true;
    }
    return false;
  }

  /**
   * Gets the rate amount in cents for a specific lesson type
   * @param lessonType The type of lesson
   * @returns The rate amount in cents or undefined if not set
   */
  getRateInCents(lessonType: LessonType): number | undefined {
    const rate = this.getHourlyRate(lessonType);
    return rate?.rateInCents;
  }

  /**
   * Gets the rate amount in dollars for a specific lesson type
   * @param lessonType The type of lesson
   * @returns The rate amount in dollars or undefined if not set
   */
  getRateInDollars(lessonType: LessonType): number | undefined {
    const rateInCents = this.getRateInCents(lessonType);
    return rateInCents !== undefined ? rateInCents / 100 : undefined;
  }
} 