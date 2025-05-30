import express from 'express';
import { clientLoggerController } from './clientLogger.controller.js';

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ClientLogEntry:
 *       type: object
 *       description: A single log entry from the client application
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: ISO timestamp when the log was created on the client
 *           example: "2024-01-15T10:30:45.123Z"
 *         level:
 *           type: string
 *           enum: [error, warn, info, debug]
 *           description: Log level/severity
 *           example: "info"
 *         message:
 *           type: string
 *           description: Human-readable log message
 *           example: "User logged in successfully"
 *         data:
 *           type: object
 *           description: Additional structured data associated with the log entry
 *           additionalProperties: true
 *           example:
 *             userId: "123"
 *             action: "login"
 *         sessionId:
 *           type: string
 *           description: Client-generated session identifier
 *           example: "sess_1642251045123_abc123"
 *         userId:
 *           type: string
 *           nullable: true
 *           description: User ID if user is authenticated
 *           example: "user_123"
 *         url:
 *           type: string
 *           format: uri
 *           description: URL where the log was generated
 *           example: "https://app.example.com/dashboard"
 *         userAgent:
 *           type: string
 *           description: Client user agent string (truncated)
 *           example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
 *         viewport:
 *           type: object
 *           description: Client viewport dimensions
 *           properties:
 *             width:
 *               type: integer
 *               example: 1920
 *             height:
 *               type: integer
 *               example: 1080
 *       required:
 *         - timestamp
 *         - level
 *         - message
 *     
 *     ClientLogsRequest:
 *       type: object
 *       description: Request body for submitting client logs
 *       properties:
 *         logs:
 *           type: array
 *           description: Array of log entries to be processed
 *           items:
 *             $ref: '#/components/schemas/ClientLogEntry'
 *           minItems: 1
 *           maxItems: 100
 *       required:
 *         - logs
 *       example:
 *         logs:
 *           - timestamp: "2024-01-15T10:30:45.123Z"
 *             level: "info"
 *             message: "User logged in"
 *             data:
 *               userId: "123"
 *               method: "email"
 *             sessionId: "sess_1642251045123_abc123"
 *             userId: "123"
 *             url: "https://app.example.com/login"
 *             userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
 *             viewport:
 *               width: 1920
 *               height: 1080
 *           - timestamp: "2024-01-15T10:30:46.456Z"
 *             level: "error"
 *             message: "API call failed"
 *             data:
 *               endpoint: "/api/v1/users"
 *               status: 500
 *               error: "Internal Server Error"
 *             sessionId: "sess_1642251045123_abc123"
 *             userId: "123"
 *             url: "https://app.example.com/dashboard"
 *             userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
 *             viewport:
 *               width: 1920
 *               height: 1080
 *     
 *     ClientLogsResponse:
 *       type: object
 *       description: Response after successfully processing client logs
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the logs were processed successfully
 *           example: true
 *         processed:
 *           type: integer
 *           description: Number of log entries that were processed
 *           example: 2
 *       required:
 *         - success
 *         - processed
 */

/**
 * @openapi
 * /logs:
 *   post:
 *     summary: Submit logs
 *     description: |
 *       Accepts and processes log entries from various sources (client applications, server components).
 *       This endpoint allows different parts of the system to send structured logs for centralized
 *       logging and monitoring. Logs are enriched with server-side metadata and forwarded
 *       to the logging system.
 *       
 *       **RESTful Design:**
 *       - `POST /logs` - Create/submit new log entries
 *       - Future: `GET /logs` - Retrieve logs (with filtering by source, level, time, etc.)
 *       - Source is specified in request body, not URL path
 *       
 *       **Features:**
 *       - Batch processing of multiple log entries
 *       - Automatic enrichment with server metadata (IP, timestamp)
 *       - Support for different log levels (error, warn, info, debug)
 *       - Session and user tracking
 *       - Request correlation via headers
 *       
 *       **Security:**
 *       - Sensitive data is automatically filtered
 *       - User agent strings are truncated to prevent abuse
 *       - Rate limiting may apply (implementation dependent)
 *     tags:
 *       - Logging
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientLogsRequest'
 *     responses:
 *       '200':
 *         description: Logs processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClientLogsResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequestError'
 *         description: |
 *           Invalid request format. Possible causes:
 *           - Missing `logs` array in request body
 *           - `logs` is not an array
 *           - Invalid log entry format
 *           - Too many log entries (>100)
 *       '413':
 *         description: Payload too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 *             example:
 *               error: "Request payload too large"
 *       '429':
 *         description: Too many requests (rate limiting)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 *             example:
 *               error: "Rate limit exceeded"
 *       '500':
 *         description: Internal server error during log processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 *             example:
 *               error: "Internal server error"
 *     x-codeSamples:
 *       - lang: 'JavaScript'
 *         label: 'Frontend Usage'
 *         source: |
 *           // Send logs to server
 *           const logs = [
 *             {
 *               timestamp: new Date().toISOString(),
 *               level: 'info',
 *               message: 'User action',
 *               data: { action: 'click', element: 'login-button' },
 *               sessionId: 'sess_123',
 *               userId: 'user_456',
 *               url: window.location.href,
 *               userAgent: navigator.userAgent,
 *               viewport: { width: window.innerWidth, height: window.innerHeight }
 *             }
 *           ];
 *           
 *           fetch('/api/v1/logs', {
 *             method: 'POST',
 *             headers: { 'Content-Type': 'application/json' },
 *             body: JSON.stringify({ logs })
 *           });
 *       - lang: 'curl'
 *         label: 'cURL Example'
 *         source: |
 *           curl -X POST https://api.example.com/api/v1/logs \
 *             -H "Content-Type: application/json" \
 *             -d '{
 *               "logs": [{
 *                 "timestamp": "2024-01-15T10:30:45.123Z",
 *                 "level": "error",
 *                 "message": "JavaScript Error",
 *                 "data": {
 *                   "error": "Cannot read property of undefined",
 *                   "filename": "app.js",
 *                   "lineno": 42
 *                 },
 *                 "sessionId": "sess_abc123",
 *                 "url": "https://app.example.com/dashboard",
 *                 "userAgent": "Mozilla/5.0...",
 *                 "viewport": {"width": 1920, "height": 1080}
 *               }]
 *             }'
 */
router.post('/', clientLoggerController.processLogs);

export default router; 