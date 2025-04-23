import { AppError } from './app.error.js';

/**
 * Represents a 404 Not Found error.
 */
export class NotFoundError extends AppError {
    /**
     * Creates an instance of NotFoundError.
     * @param message - The error message. Defaults to 'Resource not found'.
     */
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
} 