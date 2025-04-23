import { Prisma, PrismaClient, UserType } from '@prisma/client';
import prisma from '../prisma.js';
import authService, { AuthProvider } from './auth.service.js';
import { refreshTokenService } from './refreshToken.service.js';
import { studentService } from '../student/student.service.js';
import { teacherService } from '../teacher/teacher.service.js';
import { AppError } from '../errors/index.js';

interface PasswordCredentials {
  email: string;
  password: string;
  userType: UserType;
}

interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: Date;
  userType: UserType;
}

type AuthProviderResult = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
  };
  accessToken: string;
  uniqueRefreshToken: string;
};

class PasswordAuthProvider implements AuthProvider {
  async authenticate(credentials: PasswordCredentials): Promise<AuthProviderResult> {
    const { email, password, userType } = credentials;

    let user;
    if (userType === UserType.STUDENT) {
      user = await prisma.student.findUnique({ where: { email } });
    } else if (userType === UserType.TEACHER) {
      user = await prisma.teacher.findUnique({ where: { email } });
    } else {
      throw new Error(`Invalid user type provided`);
    }

    if (!user) {
      throw new Error('User not found or invalid credentials');
    }
    if (!user.password) {
      throw new Error('Password authentication not set up for this user');
    }
    if (!user.authMethods.includes('PASSWORD')) {
      throw new Error('Password authentication not enabled for this user');
    }

    const isValidPassword = await authService.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password or invalid credentials');
    }

    const accessToken = authService.generateToken({
      id: user.id,
      userType: userType,
    });

    const uniqueRefreshToken = await refreshTokenService.createRefreshToken(
      user.id,
      userType
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
      uniqueRefreshToken,
    };
  }

  async register(userData: RegisterUserData): Promise<AuthProviderResult> {
    const { userType, password, ...restUserData } = userData;

    let user;
    try {
      if (userType === UserType.STUDENT) {
        user = await studentService.create({ ...restUserData, password });
        if (!user) throw new Error('Student creation failed.');
      } else if (userType === UserType.TEACHER) {
        user = await teacherService.create({ ...restUserData, password });
        if (!user) throw new Error('Teacher creation failed.');
      } else {
        throw new Error(`Invalid user type provided`);
      }
    } catch (error: unknown) {
      if (error instanceof AppError) {
        console.error('AppError during user creation in passwordAuthProvider:', error);
        throw error;
      }

      console.error('Unexpected error during user creation in passwordAuthProvider:', error);
      if (error instanceof Error) {
        throw new Error(`Registration failed internally: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during registration.');
    }

    const accessToken = authService.generateToken({
      id: user.id,
      userType: userType,
    });

    const uniqueRefreshToken = await refreshTokenService.createRefreshToken(
      user.id,
      userType
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
      uniqueRefreshToken,
    };
  }
}

export default new PasswordAuthProvider(); 