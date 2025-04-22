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
 * Base class for shared person attributes
 * Used as a foundation for both Teacher and Student models
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