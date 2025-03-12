import { Person } from './Person';

/**
 * Student model representing users who can book and attend lessons
 * Extends the base Person model
 */
export class Student extends Person {
  // You could add student-specific properties here in the future
  // For example: preferences, payment information, lesson history
  
  constructor(
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    dateOfBirth: Date
  ) {
    super(id, firstName, lastName, email, phoneNumber, dateOfBirth);
  }
} 