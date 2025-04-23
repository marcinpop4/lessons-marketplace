import { AppError } from './app.error.js';

/**
 * Represents a 400 Bad Request error.
 */
export class BadRequestError extends AppError {
    /**
     * Creates an instance of BadRequestError.
     * @param message - The error message. Defaults to 'Bad request'.
     */
    constructor(message = 'Bad request') {
        // Call super with message first, then status code
        super(message, 400);
        this.name = 'BadRequestError'; // Explicitly set name for clarity
    }
} 