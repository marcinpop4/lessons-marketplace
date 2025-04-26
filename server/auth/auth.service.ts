import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';
import prisma from '../prisma.js'; // Required only for transaction in register method
import { Student } from '../../shared/models/Student.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { studentService } from '../student/student.service.js';
import { teacherService } from '../teacher/teacher.service.js';
import { refreshTokenService } from './refreshToken.service.js';
import { passwordService } from './password.service.js'; // Import the new PasswordService
import { AppError, DuplicateEmailError, BadRequestError } from '../errors/index.js';
import { UserType as SharedUserType } from '../../shared/models/UserType.js';
import { AuthMethodType as SharedAuthMethodType } from '../../shared/models/AuthMethodType.js';
import { authMethodService } from './auth-method.service.js'; // Import the new auth method service
import { UserType as PrismaUserType, Teacher as DbTeacher, Student as DbStudent, Prisma } from '@prisma/client';

// Use string literals that match Prisma's enums
export type AuthMethod = 'PASSWORD' | 'GOOGLE' | 'FACEBOOK';

// --- Define DTOs and Result Types Here --- 
interface RegisterUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: Date;
  userType: SharedUserType;
  auth: {
    method: AuthMethod;
    // Method-specific credentials
    password?: string; // Required for PASSWORD method
    // Future auth methods would add their specific fields here
  };
}

interface PasswordCredentials {
  email: string;
  password: string;
  userType: SharedUserType;
}

type AuthProviderResult = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: Date;
    isActive?: boolean;
    userType: SharedUserType;
  };
  accessToken: string;
  uniqueRefreshToken: string;
};
// --- End DTOs and Result Types ---

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) {
  throw new Error("JWT_EXPIRES_IN environment variable is required");
}

const secretKey: string = JWT_SECRET;
const expiresIn: string = JWT_EXPIRES_IN;

interface TokenPayload extends JwtPayload {
  id: string;
  userType: SharedUserType;
}

class AuthService {

  constructor() {
    // Constructor empty
  }

  // Note: This authenticate method now uses service methods instead of direct Prisma access
  async authenticate(credentials: PasswordCredentials): Promise<AuthProviderResult> {
    const { email, password, userType } = credentials;

    // 1. Find user profile by email and type using service methods
    let userProfile: DbTeacher | DbStudent | null = null;
    const prismaUserType = userType as PrismaUserType;
    if (userType === SharedUserType.STUDENT) {
      userProfile = await studentService.findByEmail(email);
    } else if (userType === SharedUserType.TEACHER) {
      userProfile = await teacherService.findByEmail(email);
    } else {
      throw new Error(`Invalid user type for authentication: ${userType}`);
    }

    if (!userProfile) {
      throw new Error('Authentication failed: User not found.');
    }

    // 2. Check if user has PASSWORD auth method enabled
    try {
      const hasPasswordAuth = await authMethodService.hasAuthMethod(
        userProfile.id,
        userType,
        SharedAuthMethodType.PASSWORD
      );

      if (!hasPasswordAuth) {
        throw new Error('Authentication failed: Password authentication not enabled for this user.');
      }

      // 3. Verify password using PasswordService
      const isValidPassword = await passwordService.verifyPassword(userProfile.id, userType, password);
      if (!isValidPassword) {
        throw new Error('Authentication failed: Invalid credentials.');
      }

      // 4. Generate Tokens
      const accessToken = this.generateToken({ id: userProfile.id, userType: userType });
      const uniqueRefreshToken = await refreshTokenService.createRefreshToken(userProfile.id, userType);

      // 5. Return result
      return {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          phoneNumber: userProfile.phoneNumber,
          dateOfBirth: userProfile.dateOfBirth,
          isActive: 'isActive' in userProfile ? userProfile.isActive : undefined,
          userType: userType,
        },
        accessToken,
        uniqueRefreshToken,
      };
    } catch (error) {
      // Add more specific error handling as needed
      throw error;
    }
  }

  async register(registerUserDTO: RegisterUserDTO): Promise<AuthProviderResult> {
    const { auth, userType, ...profileData } = registerUserDTO;
    // Removed destructuring for phoneNumber, dateOfBirth here as validation moved

    // --- Input Validation --- 
    // Keep only validation specific to the auth process itself
    if (auth.method === 'PASSWORD' && !auth.password) {
      throw new BadRequestError('Password is required for PASSWORD authentication method');
    }
    // REMOVED phone number validation block
    // REMOVED date of birth validation block
    // --- End Input Validation ---

    try {
      // Use transaction to ensure atomicity
      const createdUserRecord = await prisma.$transaction(async (tx) => {
        let userRecord: Student | Teacher | null = null;

        // 1. Create User Profile using the service, passing the transaction client 'tx'
        if (userType === SharedUserType.STUDENT) {
          userRecord = await studentService.create(profileData, tx);
        } else if (userType === SharedUserType.TEACHER) {
          userRecord = await teacherService.create(profileData, tx);
        } else {
          throw new Error(`Invalid user type provided for registration: ${userType}`);
        }

        if (!userRecord) {
          throw new Error('User profile creation failed within transaction.');
        }

        // 2. Create auth method entries based on the specified method
        if (auth.method === 'PASSWORD') {
          // Create Password Credential
          await passwordService.createPasswordCredential(
            userRecord.id,
            userType,
            auth.password!,
            tx
          );

          // Create UserAuthMethod entry using AuthMethodService instead of direct Prisma access
          await authMethodService.addAuthMethod(
            {
              userId: userRecord.id,
              userType: userType,
              method: SharedAuthMethodType.PASSWORD
            },
            tx
          );
        }
        // Future auth methods would be handled here with additional else-if blocks

        // Return the user record created by the user service (already mapped to shared model)
        return userRecord;
      });

      // Transaction successful, createdUserRecord holds the shared model (Student or Teacher)
      if (!createdUserRecord) {
        // Should not happen if transaction doesn't throw
        throw new Error('Transaction completed but user record is missing.');
      }

      // 3. Generate Tokens (outside transaction)
      const accessToken = this.generateToken({
        id: createdUserRecord.id,
        userType: userType,
      });
      const uniqueRefreshToken = await refreshTokenService.createRefreshToken(
        createdUserRecord.id,
        userType
      );

      // 4. Return result using data from the shared model record
      return {
        user: {
          id: createdUserRecord.id,
          email: createdUserRecord.email,
          firstName: createdUserRecord.firstName,
          lastName: createdUserRecord.lastName,
          phoneNumber: createdUserRecord.phoneNumber,
          dateOfBirth: createdUserRecord.dateOfBirth,
          isActive: 'isActive' in createdUserRecord ? createdUserRecord.isActive : undefined,
          userType: userType,
        },
        accessToken,
        uniqueRefreshToken,
      };

    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Simplified P2002 handling - assume email duplicate from user services or credential duplicate from password service
        if (error.message.includes('PasswordCredential')) { // Check if error message indicates credential table
          throw new AppError('Password credential already exists for this user.', 409);
        } else {
          throw new DuplicateEmailError(registerUserDTO.email);
        }
      }
      if (error instanceof AppError && error.isOperational) {
        throw error;
      }
      console.error('Unexpected error during registration transaction:', error);
      if (error instanceof Error) {
        throw new Error(`Registration failed transactionally: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during registration.');
    }
  }

  // Generate JWT Access Token (Keep)
  generateToken(payload: { id: string; userType: SharedUserType }): string {
    const options: SignOptions = {
      expiresIn: expiresIn as any
    };
    return jwt.sign(payload, secretKey, options);
  }

  // Verify JWT Access Token (Keep)
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, secretKey) as TokenPayload;
      if (!decoded || typeof decoded !== 'object' || !decoded.id || !decoded.userType) {
        throw new Error('Invalid token payload structure');
      }
      if (decoded.userType !== SharedUserType.STUDENT && decoded.userType !== SharedUserType.TEACHER) {
        throw new Error('Invalid userType in token');
      }
      return decoded;
    } catch (error: any) {
      console.error("JWT Verification Error:", error.message || error);
      throw new Error('Invalid or expired token');
    }
  }

  // Fetches user and returns shared model instance
  async getUserByIdAndType(id: string, userType: SharedUserType): Promise<Student | Teacher | null> {
    try {
      if (userType === SharedUserType.STUDENT) {
        return studentService.findById(id);
      } else if (userType === SharedUserType.TEACHER) {
        return teacherService.findById(id);
      } else {
        console.warn(`getUserByIdAndType called with invalid userType: ${userType}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching user ${id} (${userType}):`, error);
      throw new Error('Failed to fetch user data');
    }
  }
}

const authServiceInstance = new AuthService();

export default authServiceInstance; 