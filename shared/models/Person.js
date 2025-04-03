/**
 * Base class for shared person attributes
 * Used as a foundation for both Teacher and Student models
 */
export class Person {
    id;
    firstName;
    lastName;
    email;
    phoneNumber;
    dateOfBirth;
    constructor(id, firstName, lastName, email, phoneNumber, dateOfBirth) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.dateOfBirth = dateOfBirth;
    }
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
}
