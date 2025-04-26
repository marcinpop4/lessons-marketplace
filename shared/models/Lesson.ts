import { LessonStatus, LessonStatusValue } from './LessonStatus.js';
import { LessonQuote } from './LessonQuote.js';
import { Goal } from './Goal.js';
import { LessonType } from './LessonType.js';
import { Teacher } from './Teacher.js';
import { Student } from './Student.js';
import { Address } from './Address.js';

/**
 * Database representation of a Lesson with nested relations
 */
export interface DbLessonWithNestedRelations {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  quoteId: string;
  currentStatusId: string;
  currentStatus: {
    id: string;
    lessonId: string;
    status: string;
    context: any;
    createdAt: Date;
  };
  quote: {
    id: string;
    lessonRequestId: string;
    teacherId: string;
    hourlyRate: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    teacher: any;
    lessonRequest: any;
  };
}

// Define interfaces for required properties of a Lesson
export interface LessonProps {
  id: string;
  quote: LessonQuote;
  currentStatus?: LessonStatus | null;
  statuses?: LessonStatus[];
  goals?: Goal[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Represents a booked music lesson
 */
export class Lesson implements LessonProps {
  id: string;
  quote: LessonQuote;
  currentStatus: LessonStatus | null;
  statuses: LessonStatus[];
  goals: Goal[];
  createdAt: Date;
  updatedAt: Date;

  constructor({
    id,
    quote,
    currentStatus = null,
    statuses = [],
    goals = [],
    createdAt = new Date(),
    updatedAt = new Date()
  }: LessonProps) {
    this.id = id;
    this.quote = quote;
    this.currentStatus = currentStatus;
    this.statuses = statuses;
    this.goals = goals;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Adds a status to the lesson's status history
   * @param status The new status to add
   */
  addStatus(status: LessonStatus): void {
    this.statuses.push(status);
    this.currentStatus = status;
  }

  /**
   * Creates a scheduled lesson with initial status
   * @param id Unique identifier for the lesson
   * @param quote The lesson quote that was accepted
   * @param statusId Unique ID for the initial status
   * @returns A new Lesson instance
   */
  static createScheduled(id: string, quote: LessonQuote, statusId: string): Lesson {
    const initialStatus = new LessonStatus({
      id: statusId,
      lessonId: id,
      status: LessonStatusValue.ACCEPTED
    });

    return new Lesson({
      id,
      quote,
      currentStatus: initialStatus,
      statuses: [initialStatus],
      goals: []
    });
  }

  /**
   * Adds a goal to the lesson
   * @param goal The goal to add
   */
  addGoal(goal: Goal): void {
    this.goals.push(goal);
  }

  /**
   * Gets the details of the teacher for this lesson
   * @returns Teacher object
   */
  getTeacher() {
    return this.quote.teacher;
  }

  /**
   * Gets the details of the student for this lesson
   * @returns Student object
   */
  getStudent() {
    return this.quote.lessonRequest.student;
  }

  /**
   * Gets the address for this lesson
   * @returns Address object
   */
  getAddress() {
    return this.quote.lessonRequest.address;
  }

  /**
   * Gets the start time for this lesson
   * @returns Date object representing the start time
   */
  getStartTime() {
    return this.quote.lessonRequest.startTime;
  }

  /**
   * Gets the end time for this lesson based on start time and duration
   * @returns Date object representing the end time
   */
  getEndTime() {
    const startTime = this.getStartTime();
    const durationMinutes = this.quote.lessonRequest.durationMinutes;

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    return endTime;
  }

  /**
   * Gets the lesson type
   * @returns LessonType enum value
   */
  getLessonType() {
    return this.quote.lessonRequest.type;
  }

  /**
   * Format the cost as a currency string
   * @param locale The locale to use for formatting (defaults to en-US)
   * @param currency The currency code to use (defaults to USD)
   * @returns Formatted currency string
   */
  getFormattedCost(locale = 'en-US', currency = 'USD'): string {
    return this.quote.getFormattedCost(locale, currency);
  }
} 