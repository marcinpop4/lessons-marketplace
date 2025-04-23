import bcryptjs from 'bcryptjs';
import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';
import prisma from '../prisma.js';
import passwordAuthService from './password.service.js'; // Renamed import
import { Student } from '../../shared/models/Student.js'; // Import shared Student model
import { Teacher } from '../../shared/models/Teacher.js'; // Import shared Teacher model
// Assuming UserType enum is available via prisma instance or direct import
// If the UserType lint error persists, we might need to use string literals 'STUDENT' | 'TEACHER' here.
import { UserType } from '@prisma/client';

// Use string literals that match Prisma's enums
export type AuthMethod = 'PASSWORD' | 'GOOGLE' | 'FACEBOOK';
// export type UserType = 'STUDENT' | 'TEACHER'; // Use Prisma's type if available

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) {
  throw new Error("JWT_EXPIRES_IN environment variable is required");
}

// Assertion to satisfy TypeScript since we've already checked that these are defined
const secretKey: string = JWT_SECRET;
const expiresIn: string = JWT_EXPIRES_IN;

// Interface for the expected structure of the JWT payload
interface TokenPayload extends JwtPayload {
  id: string;
  userType: UserType;
}

// Interface for auth providers
export interface AuthProvider {
  authenticate(credentials: any): Promise<{ user: any; accessToken: string; uniqueRefreshToken: string }>;
  register(userData: any): Promise<{ user: any; accessToken: string; uniqueRefreshToken: string }>;
}

// Base authentication service that will work with different providers
class AuthService {
  private providers: Record<AuthMethod, AuthProvider>;

  constructor() {
    this.providers = {} as Record<AuthMethod, AuthProvider>;
    this.registerProvider('PASSWORD', passwordAuthService);
  }

  registerProvider(method: AuthMethod, provider: AuthProvider) {
    this.providers[method] = provider;
  }

  async authenticate(method: AuthMethod, credentials: any) {
    const provider = this.providers[method];
    if (!provider) {
      throw new Error(`Authentication method ${method} not supported`);
    }

    return provider.authenticate(credentials);
  }

  async register(method: AuthMethod, userData: any) {
    const provider = this.providers[method];
    if (!provider) {
      throw new Error(`Authentication method ${method} not supported`);
    }

    return provider.register(userData);
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcryptjs.hash(password, saltRounds);
  }

  // Compare password with hash
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  // Generate JWT Access Token
  generateToken(payload: { id: string; userType: UserType }): string {
    const options: SignOptions = {
      expiresIn: expiresIn as any
    };
    return jwt.sign(payload, secretKey, options);
  }

  // Verify JWT Access Token
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, secretKey) as TokenPayload;

      if (!decoded || typeof decoded !== 'object' || !decoded.id || !decoded.userType) {
        throw new Error('Invalid token payload structure');
      }

      if (decoded.userType !== 'STUDENT' && decoded.userType !== 'TEACHER') {
        throw new Error('Invalid userType in token');
      }

      return decoded;
    } catch (error: any) {
      console.error("JWT Verification Error:", error.message || error);
      throw new Error('Invalid or expired token');
    }
  }

  // Fetches user and returns shared model instance
  async getUserByIdAndType(id: string, userType: UserType): Promise<Student | Teacher | null> {
    // Update selectFields to include all properties needed by shared model constructors
    const selectFields = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phoneNumber: true, // Added
      dateOfBirth: true, // Added
      // Add any other fields required by StudentProps/TeacherProps
    };
    // Adjust type definition for userData based on actual selected fields and their nullability
    let userData: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null; // Assuming it can be null
      dateOfBirth: Date | null;   // Assuming it can be null
    } | null = null;

    try {
      // Use Prisma UserType enum if possible, otherwise strings
      // If UserType import fails, replace UserType.STUDENT with 'STUDENT', etc.
      if (userType === UserType.STUDENT) {
        userData = await prisma.student.findUnique({ where: { id }, select: selectFields });
        if (userData) {
          // Ensure nulls are handled if constructors don't expect them
          // Or adjust constructors to handle potential nulls from DB
          // Using 'as any' for now to bypass strict type checking, assuming constructors are compatible.
          // TODO: Refine type compatibility between Prisma result and Shared Model Props.
          return new Student(userData as any);
        }
      } else if (userType === UserType.TEACHER) {
        userData = await prisma.teacher.findUnique({ where: { id }, select: selectFields });
        if (userData) {
          // Ensure nulls are handled if constructors don't expect them
          // Using 'as any' for now to bypass strict type checking, assuming constructors are compatible.
          // TODO: Refine type compatibility between Prisma result and Shared Model Props.
          return new Teacher(userData as any);
        }
      } else {
        console.warn(`getUserByIdAndType called with invalid userType: ${userType}`);
        return null;
      }
      // If user not found for the specified type
      return null;
    } catch (error) {
      console.error(`Database error fetching user ${id} (${userType}):`, error);
      throw new Error('Failed to fetch user data');
    }
  }
}

const authServiceInstance = new AuthService();

// Export the instance and helper methods if needed directly
export const hashPassword = authServiceInstance.hashPassword.bind(authServiceInstance);
export const comparePassword = authServiceInstance.comparePassword.bind(authServiceInstance);

export default authServiceInstance; 