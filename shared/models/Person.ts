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
} 