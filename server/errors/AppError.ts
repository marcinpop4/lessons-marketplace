/**
 * Base class for custom application errors.
 */
export class AppError extends Error {
    public readonly status: number;
    public readonly isOperational: boolean;

    /**
     * Creates an instance of AppError.
     * @param statusCode - The HTTP status code associated with the error.
     * @param message - The error message.
     * @param isOperational - Flag indicating if it's an operational error (vs. programmer error). Defaults to true.
     */
    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);

        this.status = statusCode;
        this.isOperational = isOperational;

        // Set the prototype explicitly to ensure instanceof works correctly
        Object.setPrototypeOf(this, new.target.prototype);

        // Capture the stack trace, excluding the constructor call
        Error.captureStackTrace(this, this.constructor);

        // Optional: Set the error name to the class name
        this.name = this.constructor.name;
    }
} 