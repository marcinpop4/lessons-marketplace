import { AppError } from './app.error.js';

// Specific error for duplicate resource conflicts (like email)
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        // Call super with message first, then status code
        super(message, 409); // HTTP 409 Conflict
        this.name = 'ConflictError'; // Explicitly set name for clarity
    }
} 