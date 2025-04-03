import { Person } from './Person.js';
/**
 * Student model representing users who can book and attend lessons
 * Extends the base Person model
 */
export class Student extends Person {
    // You could add student-specific properties here in the future
    // For example: preferences, payment information, lesson history
    constructor(id, firstName, lastName, email, phoneNumber, dateOfBirth) {
        super(id, firstName, lastName, email, phoneNumber, dateOfBirth);
    }
}
