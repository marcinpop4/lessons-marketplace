import { AppError } from './AppError.js';

/**
 * Represents a 400 Bad Request error.
 */
export class BadRequestError extends AppError {
    /**
     * Creates an instance of BadRequestError.
     * @param message - The error message. Defaults to 'Bad request'.
     */
    constructor(message = 'Bad request') {
        super(400, message);
        this.name = 'BadRequestError';
    }
} 