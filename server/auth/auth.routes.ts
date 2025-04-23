import express, { Router } from 'express';
import { authController } from './auth.controller.js'; // Import the controller

const router: Router = express.Router();

// Register endpoint - Use controller method
router.post('/register', authController.register);

// Login endpoint - Use controller method
router.post('/login', authController.login);

// Logout endpoint - Use controller method
router.post('/logout', authController.logout);

// Get current user endpoint - Use controller method
router.get('/me', authController.getCurrentUser); // Note: Consider adding auth middleware here

export default router; 