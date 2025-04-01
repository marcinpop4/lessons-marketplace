import { Prisma } from '@prisma/client';
import prisma from '../../prisma.js';
import authService, { AuthProvider } from './authService.js';
import logger from '../../utils/logger.js';

interface PasswordCredentials {
  email: string;
  password: string;
  userType: 'STUDENT' | 'TEACHER';
}

interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: Date;
  userType: 'STUDENT' | 'TEACHER';
}

class PasswordAuthProvider implements AuthProvider {
  async authenticate(credentials: PasswordCredentials) {
    const { email, password, userType } = credentials;

    // Find the user based on userType
    let user;
    if (userType === 'STUDENT') {
      user = await prisma.student.findUnique({ where: { email } });
    } else if (userType === 'TEACHER') {
      user = await prisma.teacher.findUnique({ where: { email } });
    } else {
      throw new Error('Invalid user type');
    }

    // Check if user exists
    if (!user) {
      throw new Error('User not found');
    }

    // Check if password is set
    if (!user.password) {
      throw new Error('Password authentication not set up for this user');
    }

    // Check if user's authMethods includes PASSWORD
    if (!user.authMethods.includes('PASSWORD')) {
      throw new Error('Password authentication not enabled for this user');
    }

    // Verify password
    const isValidPassword = await authService.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Generate tokens
    const accessToken = authService.generateToken({
      id: user.id,
      email: user.email,
      userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
    });

    const refreshToken = await authService.generateRefreshToken(
      user.id, 
      userType === 'STUDENT' ? 'STUDENT' : 'TEACHER'
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: userType,
      },
      accessToken,
      refreshToken,
    };
  }

  async register(userData: RegisterUserData) {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phoneNumber, 
      dateOfBirth, 
      userType 
    } = userData;

    // Hash the password
    const hashedPassword = await authService.hashPassword(password);

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
            dateOfBirth,
            authMethods: ['PASSWORD'],
          },
        });
      } else if (userType === 'TEACHER') {
        user = await prisma.teacher.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            authMethods: ['PASSWORD'],
          },
        });
      } else {
        throw new Error('Invalid user type');
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle unique constraint violation
        if (error.code === 'P2002') {
          throw new Error('Email already exists');
        }
      }
      // Rethrow the error
      throw error;
    }

    // Generate tokens
    const accessToken = authService.generateToken({
      id: user.id,
      email: user.email,
      userType: userType === 'STUDENT' ? 'STUDENT' : 'TEACHER',
    });

    const refreshToken = await authService.generateRefreshToken(
      user.id, 
      userType === 'STUDENT' ? 'STUDENT' : 'TEACHER'
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: userType,
      },
      accessToken,
      refreshToken,
    };
  }
}

export default new PasswordAuthProvider(); 