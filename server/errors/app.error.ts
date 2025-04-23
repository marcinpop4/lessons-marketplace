// Base class for predictable application errors with status codes
export class AppError extends Error {
    public readonly status: number;
    public readonly isOperational: boolean;

    /**
     * Creates an instance of AppError.
     * @param message - The error message.
     * @param status - The HTTP status code associated with the error.
     * @param isOperational - Flag indicating if it's an operational error (vs. programmer error). Defaults to true.
     */
    constructor(message: string, status: number, isOperational = true) {
        super(message); // Pass message to the base Error constructor

        this.status = status; // Store the HTTP status code
        this.isOperational = isOperational; // Store operational flag

        // Set the error name to the class name, useful for logging/debugging
        this.name = this.constructor.name;

        // Set the prototype explicitly to ensure instanceof works correctly
        Object.setPrototypeOf(this, new.target.prototype);

        // Maintains proper stack trace in V8 environments (like Node.js)
        // Capturing the stack trace here excludes the constructor call from the trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
} 