import { Person } from './Person.js';
import { LessonType } from './LessonType.js';
import { TeacherLessonHourlyRate } from './TeacherLessonHourlyRate.js';

/**
 * Teacher model representing instructors who offer music lessons
 * Extends the base Person model and adds teaching-specific properties
 */
export class Teacher extends Person {
  // Collection of hourly rates by lesson type
  hourlyRates: TeacherLessonHourlyRate[];
  
  constructor(
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    dateOfBirth: Date,
    hourlyRates: TeacherLessonHourlyRate[] = []
  ) {
    super(id, firstName, lastName, email, phoneNumber, dateOfBirth);
    this.hourlyRates = hourlyRates;
  }

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
  getHourlyRate(lessonType: string): TeacherLessonHourlyRate | undefined {
    return this.hourlyRates.find(rate => rate.type === lessonType);
  }

  /**
   * Gets the rate amount in cents for a specific lesson type
   * @param lessonType The type of lesson
   * @returns The rate amount in cents or undefined if not set
   */
  getRateInCents(lessonType: string): number | undefined {
    const rate = this.getHourlyRate(lessonType);
    return rate?.rateInCents;
  }

  /**
   * Gets the rate amount in dollars for a specific lesson type
   * @param lessonType The type of lesson
   * @returns The rate amount in dollars or undefined if not set
   */
  getRateInDollars(lessonType: string): number | undefined {
    const rateInCents = this.getRateInCents(lessonType);
    return rateInCents !== undefined ? rateInCents / 100 : undefined;
  }
} 