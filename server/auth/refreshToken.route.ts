import express, { Router } from 'express';
import { refreshTokenController } from './refreshToken.controller.js';

const router: Router = express.Router();

// POST /auth/refresh-token - Refresh the access token
router.post('/refresh-token', refreshTokenController.refreshAccessToken);

export default router; 