import express, { Router } from 'express';
import { refreshTokenController } from './refreshToken.controller.js';

const router: Router = express.Router();

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Uses a valid refresh token (sent via HttpOnly cookie) to generate a new access token.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Access token refreshed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: The new JWT access token.
 *       '401':
 *         description: Unauthorized (Invalid or expired refresh token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh-token', refreshTokenController.refreshAccessToken);

export default router; 