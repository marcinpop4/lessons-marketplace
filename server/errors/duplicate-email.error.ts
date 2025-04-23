import { ConflictError } from './conflict.error.js';

// Specific error for duplicate email
export class DuplicateEmailError extends ConflictError {
    constructor(email: string) {
        super(`Email ${email} already exists.`);
        this.name = 'DuplicateEmailError'; // Explicitly set name
    }
} 