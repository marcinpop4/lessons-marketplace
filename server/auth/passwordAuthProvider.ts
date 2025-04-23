import { Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import authService, { AuthProvider } from './authService.js';
import { studentService } from '../student/student.service.js';
import { teacherService } from '../teacher/teacher.service.js';

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

    // Create user based on userType
    let user;
    try {
      if (userType === 'STUDENT') {
        user = await studentService.create({
          ...userData,
          password: password
        });

        if (!user) {
          throw new Error('Student creation failed unexpectedly in service.');
        }
      } else if (userType === 'TEACHER') {
        user = await teacherService.create({
          ...userData,
          password: password
        });

        if (!user) {
          throw new Error('Teacher creation failed unexpectedly in service.');
        }
      } else {
        throw new Error('Invalid user type');
      }
    } catch (error) {
      console.error('Error during user creation in passwordAuthProvider:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('An unexpected error occurred during registration.');
    }

    // Generate tokens
    const accessToken = authService.generateToken({
      id: user.id,
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