import { AppError } from './AppError.js';

/**
 * Represents a 404 Not Found error.
 */
export class NotFoundError extends AppError {
    /**
     * Creates an instance of NotFoundError.
     * @param message - The error message. Defaults to 'Resource not found'.
     */
    constructor(message = 'Resource not found') {
        super(404, message);
        this.name = 'NotFoundError';
    }
} 