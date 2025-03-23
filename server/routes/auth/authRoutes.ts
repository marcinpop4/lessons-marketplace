import express from 'express';
import type { Request, Response } from 'express';
import prisma from '../../prisma.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { Secret, SignOptions } from 'jsonwebtoken';

const router = express.Router();

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

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcryptjs.hash(password, saltRounds);
};

// Compare password with hash
export const comparePasswords = async (password: string, hash: string): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
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
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate userType
    if (userType !== 'STUDENT' && userType !== 'TEACHER') {
      return res.status(400).json({ error: 'Invalid userType' });
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
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        userType 
      }, 
      JWT_SECRET as Secret, 
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    // Calculate refresh token expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

    // Generate refresh token
    const refreshToken = jwt.sign({ id: user.id, type: userType }, JWT_SECRET as Secret);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
        expiresAt,
      },
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Return user and access token
    return res.status(201).json({
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
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, userType } = req.body;

    // Validate required fields
    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType are required' });
    }

    // Validate userType
    if (userType !== 'STUDENT' && userType !== 'TEACHER') {
      return res.status(400).json({ error: 'Invalid userType' });
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password is set
    if (!user.password) {
      return res.status(401).json({ error: 'Password authentication not set up for this user' });
    }

    // Check if user's authMethods includes PASSWORD
    if (!user.authMethods.includes('PASSWORD')) {
      return res.status(401).json({ error: 'Password authentication not enabled for this user' });
    }

    // Verify password
    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        userType 
      }, 
      JWT_SECRET as Secret, 
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    // Calculate refresh token expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

    // Generate refresh token
    const refreshToken = jwt.sign({ id: user.id, type: userType }, JWT_SECRET as Secret);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
        expiresAt,
      },
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Return user and access token
    return res.status(200).json({
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
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not provided' });
    }

    // Find the refresh token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!storedToken) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string; type: string };
    } catch (error) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        id: storedToken.userId, 
        userType: storedToken.userType 
      }, 
      JWT_SECRET as Secret, 
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    // Calculate new refresh token expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN);

    // Generate new refresh token
    const newRefreshToken = jwt.sign({ id: storedToken.userId, type: storedToken.userType }, JWT_SECRET as Secret);

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });

    // Store new refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.userId,
        userType: storedToken.userType,
        expiresAt,
      },
    });

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    // Return new access token
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Failed to refresh token' });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke refresh token
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user endpoint
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; userType: string };
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
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
      return res.status(400).json({ error: 'Invalid user type' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data with userType added
    return res.status(200).json({
      ...user,
      userType,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Failed to get user data' });
  }
});

export default router; 