import express, { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { Secret, SignOptions } from 'jsonwebtoken';
import authService, { hashPassword, comparePassword } from './authService.js';
import crypto from 'crypto';

const router: Router = express.Router();

// Set cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) {
  throw new Error("JWT_EXPIRES_IN environment variable is required");
}
const REFRESH_TOKEN_EXPIRES_IN = 7; // days

// Register endpoint
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      userType
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !userType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate userType
    if (userType !== 'STUDENT' && userType !== 'TEACHER') {
      res.status(400).json({ error: 'Invalid userType' });
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create user based on userType
    let user;
    try {
      if (userType === 'STUDENT') {
        user = await prisma.student.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth: new Date(dateOfBirth),
            authMethods: ['PASSWORD'],
          },
        });
      } else {
        user = await prisma.teacher.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth: new Date(dateOfBirth),
            authMethods: ['PASSWORD'],
          },
        });
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      throw error;
    }

    // Generate Access JWT token (payload only needs essential info for verification)
    const accessToken = authService.generateToken({
      id: user.id,
      userType
    });

    // Calculate refresh token expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

    // Generate a secure random string for the database refresh token
    const uniqueRefreshToken = crypto.randomBytes(32).toString('hex');

    // Store unique refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: uniqueRefreshToken,
        userId: user.id,
        userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
        expiresAt,
      },
    });

    // Set refresh token cookie with the unique random string
    res.cookie('refreshToken', uniqueRefreshToken, cookieOptions);

    // Return user and access token
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, userType } = req.body;

    // Validate required fields
    if (!email || !password || !userType) {
      res.status(400).json({ error: 'Email, password, and userType are required' });
      return;
    }

    // Validate userType
    if (userType !== 'STUDENT' && userType !== 'TEACHER') {
      res.status(400).json({ error: 'Invalid userType' });
      return;
    }

    // Find the user based on userType
    let user;
    if (userType === 'STUDENT') {
      user = await prisma.student.findUnique({ where: { email } });
    } else {
      user = await prisma.teacher.findUnique({ where: { email } });
    }

    // Check if user exists
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if password is set
    if (!user.password) {
      res.status(401).json({ error: 'Password authentication not set up for this user' });
      return;
    }

    // Check if user's authMethods includes PASSWORD
    if (!user.authMethods.includes('PASSWORD')) {
      res.status(401).json({ error: 'Password authentication not enabled for this user' });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate Access JWT token
    const accessToken = authService.generateToken({
      id: user.id,
      userType
    });

    // Calculate refresh token expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

    // Generate a secure random string for the database refresh token
    const uniqueRefreshToken = crypto.randomBytes(32).toString('hex');

    // Store unique refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: uniqueRefreshToken,
        userId: user.id,
        userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
        expiresAt,
      },
    });

    // Set refresh token cookie with the unique random string
    res.cookie('refreshToken', uniqueRefreshToken, cookieOptions);

    // Return user and access token
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    // Find refresh token (the opaque string) in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken, // Look up using the token string directly
        revokedAt: null,   // Ensure not revoked
        expiresAt: {
          gt: new Date()     // Ensure not expired
        }
      }
    });

    if (!storedToken) {
      // Clear potentially invalid cookie
      res.clearCookie('refreshToken', cookieOptions);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Token found in DB and is valid, proceed to get user info
    const userType = storedToken.userType;
    const userId = storedToken.userId;

    // Find user based on token type and ID
    let user;
    if (userType === 'STUDENT') {
      user = await prisma.student.findUnique({ where: { id: userId } });
    } else {
      user = await prisma.teacher.findUnique({ where: { id: userId } });
    }

    if (!user) {
      // User associated with token not found (data inconsistency?)
      // Clear potentially invalid cookie
      res.clearCookie('refreshToken', cookieOptions);
      res.status(401).json({ error: 'User for refresh token not found' });
      return;
    }

    // Generate NEW access token
    const accessToken = authService.generateToken({
      id: user.id,
      userType
    });

    // Return user and new access token
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    // Send 500 for unexpected errors during refresh
    res.status(500).json({ error: 'Failed to refresh token', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', cookieOptions);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user endpoint
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; userType: string };
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { id, userType } = decoded;

    // Fetch user data based on userType
    let user;
    if (userType === 'STUDENT') {
      user = await prisma.student.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    } else if (userType === 'TEACHER') {
      user = await prisma.teacher.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    } else {
      res.status(400).json({ error: 'Invalid user type' });
      return;
    }

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Return user data with userType added
    res.status(200).json({
      ...user,
      userType,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

export default router; 