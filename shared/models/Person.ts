/**
 * Properties required to create a Person instance (or call super).
 */
interface PersonProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     Person:
 *       type: object
 *       description: Base properties common to both Students and Teachers.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the person.
 *         firstName:
 *           type: string
 *           description: Person's first name.
 *         lastName:
 *           type: string
 *           description: Person's last name.
 *         email:
 *           type: string
 *           format: email
 *           description: Person's email address.
 *         phoneNumber:
 *           type: string
 *           description: Person's phone number.
 *         dateOfBirth:
 *           type: string
 *           format: date-time # Or just 'date' if time is not stored
 *           description: Person's date of birth.
 *         fullName:
 *           type: string
 *           description: Person's full name (derived).
 *           readOnly: true
 *         age:
 *           type: integer
 *           nullable: true
 *           description: Person's age in years (derived).
 *           readOnly: true
 *       required:
 *         - id
 *         - firstName
 *         - lastName
 *         - email
 *         - phoneNumber
 *         - dateOfBirth
 */
export abstract class Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;

  // Updated constructor using object destructuring
  constructor({
    id,
    firstName,
    lastName,
    email,
    phoneNumber,
    dateOfBirth
  }: PersonProps) { // Type annotation using the interface
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.dateOfBirth = dateOfBirth;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Calculate the person's age based on their date of birth.
   * @returns The age in years, or null if dateOfBirth is invalid.
   */
  get age(): number | null {
    if (!this.dateOfBirth || !(this.dateOfBirth instanceof Date) || isNaN(this.dateOfBirth.getTime())) {
      // Return null or handle invalid date appropriately
      return null;
    }
    const today = new Date();
    const birthDate = this.dateOfBirth;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
} 