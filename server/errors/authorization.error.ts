import { AppError } from './app.error.js';

// Error for authorization failures (user authenticated but lacks permissions)
export class AuthorizationError extends AppError {
    constructor(message = "Authorization failed") {
        super(message, 403); // HTTP 403 Forbidden
        this.name = "AuthorizationError"; // Explicitly set name for clarity
    }
} 