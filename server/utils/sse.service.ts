import { Response } from 'express';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for SSE service
const logger = createChildLogger('sse-service');

/**
 * Sends a specific SSE event with optional JSON data.
 * @param res - Express Response object.
 * @param eventType - The type of the event (e.g., 'message', 'error', 'done').
 * @param data - Optional JSON-serializable data for the event.
 */
const sendSseEvent = (res: Response, eventType: string, data?: any): void => {
    let dataString = '';
    if (data !== undefined) {
        try {
            dataString = `data: ${JSON.stringify(data)}\n`;
        } catch (e) {
            logger.error(`[SSE Service] Failed to stringify data for event type ${eventType}:`, { data, error: e });
            // Optionally send an error event back or just log
            dataString = `data: ${JSON.stringify({ error: "Failed to serialize event data on server." })}\n`;
            eventType = 'error'; // Force event type to error
        }
    }
    const message = `event: ${eventType}\n${dataString}\n`;
    logger.debug(`[SSE Service] Sending event: ${message.replace(/\n/g, '\\n')}`); // Log sent event
    res.write(message);
};

/**
 * Sets standard headers for Server-Sent Events (SSE).
 * @param res - Express Response object.
 */
const setSseHeaders = (res: Response): void => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection
};

/**
 * Sends a JSON object as an SSE data event (uses default 'message' event type).
 * @param res - Express Response object.
 * @param data - The JSON-serializable data to send.
 */
const sendSseData = (res: Response, data: any): void => {
    // Default event type is 'message' if not specified
    sendSseEvent(res, 'message', data);
};

/**
 * Sends an error message as an SSE event. Ensures message is always a non-empty string.
 * @param res - Express Response object.
 * @param message - The error message string (or undefined/null).
 * @param errorType - Optional event type (defaults to 'error')
 */
const sendSseError = (res: Response, message: string | undefined | null, errorType: string = 'error'): void => {
    // Ensure we always have a valid string message
    const errorMessage = (typeof message === 'string' && message.trim().length > 0)
        ? message
        : 'An error occurred during stream generation.'; // Default message if input is invalid

    const errorPayload = { message: errorMessage };

    // Log the error being sent to the client (handled by sendSseEvent now)
    // logger.debug(`[SSE Service] Sending error event - Type: ${errorType}, Payload: ${JSON.stringify(errorPayload)}`);

    sendSseEvent(res, errorType, errorPayload);
};

/**
 * Ends the SSE stream.
 * @param res - Express Response object.
 */
const endSseStream = (res: Response): void => {
    logger.info("[SSE Service] Ending SSE stream.");
    res.end();
};

/**
 * Handles streaming JSON data using Server-Sent Events (SSE).
 *
 * @param res - The Express Response object.
 * @param asyncGeneratorFunction - An async generator function that yields the JSON objects to stream.
 * @param onError - Optional callback to handle errors during generation.
 */
export const streamJsonResponse = async (
    res: Response,
    asyncGeneratorFunction: () => AsyncGenerator<any, void, unknown>,
    onError?: (error: any) => void
): Promise<void> => {
    setSseHeaders(res);
    let streamError: any = null; // Track if an error occurred

    try {
        for await (const chunk of asyncGeneratorFunction()) {
            if (!res.writableEnded) { // Check if client disconnected
                sendSseData(res, chunk); // Uses 'message' event type
            } else {
                logger.info('[SSE Service] Client disconnected during stream.');
                streamError = new Error('Client disconnected'); // Mark as error if client disconnects
                break; // Stop streaming if client disconnected
            }
        }
        // Signal end of stream ONLY if no error occurred and client still connected
        // REMOVED: Explicit 'done' event sending is potentially causing timing issues.
        // The finally block will handle calling res.end() for clean closure.
        // if (!streamError && !res.writableEnded) {
        //     logger.debug('[SSE Service] Stream generation complete, sending done event.');
        //     sendSseEvent(res, 'done', { message: 'Stream completed successfully.' });
        // }
    } catch (error: any) {
        streamError = error; // Capture the error
        logger.error('[SSE Service] Error during stream generation:', { error }); // Log the full error server-side
        if (onError) {
            onError(error);
        }
        if (!res.writableEnded) {
            // Pass the error message (or let sendSseError handle default)
            sendSseError(res, error?.message); // Uses 'error' event type
        }
    } finally {
        if (!res.writableEnded) {
            // Log whether we are ending cleanly or after an error
            if (!streamError) {
                logger.info('[SSE Service] Stream finished successfully, sending done event and closing connection.');
                // Send the [DONE] sentinel as a raw string for the data field
                res.write('event: message\n');
                res.write('data: [DONE]\n\n');
                // res.flush(); // REVERTED: Causing TypeError: res.flush is not a function in some contexts
            } else {
                logger.info(`[SSE Service] Stream finished with error, closing connection.`);
            }
            // Always end the stream if the client is still connected
            endSseStream(res);
        }
    }
}; 