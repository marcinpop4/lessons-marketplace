import { AppError } from './app.error.js';

// Error for authentication failures
export class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 401); // HTTP 401 Unauthorized
        this.name = "AuthenticationError"; // Explicitly set name for clarity
    }
} 