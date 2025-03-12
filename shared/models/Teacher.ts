import { Person } from './Person';
import { LessonType } from './LessonType';

/**
 * Teacher model representing instructors who offer music lessons
 * Extends the base Person model and adds teaching-specific properties
 */
export class Teacher extends Person {
  // Map of lesson types to hourly rates
  hourlyRates: Map<LessonType, number>;
  
  constructor(
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    dateOfBirth: Date,
    hourlyRates: Map<LessonType, number> = new Map()
  ) {
    super(id, firstName, lastName, email, phoneNumber, dateOfBirth);
    this.hourlyRates = hourlyRates;
  }

  /**
   * Sets the hourly rate for a specific lesson type
   * @param lessonType The type of lesson
   * @param rate The hourly rate in the default currency
   */
  setHourlyRate(lessonType: LessonType, rate: number): void {
    this.hourlyRates.set(lessonType, rate);
  }

  /**
   * Gets the hourly rate for a specific lesson type
   * @param lessonType The type of lesson
   * @returns The hourly rate or undefined if not set
   */
  getHourlyRate(lessonType: LessonType): number | undefined {
    return this.hourlyRates.get(lessonType);
  }
} 