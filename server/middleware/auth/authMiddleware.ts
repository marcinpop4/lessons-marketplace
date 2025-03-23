import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Assertion to satisfy TypeScript
const secretKey: string = JWT_SECRET;

// Interface for JWT payload
interface JwtPayload {
  id: string;
  email: string;
  userType: 'STUDENT' | 'TEACHER';
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Middleware to validate token
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, secretKey) as JwtPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// Middleware to check if user is a student
export function isStudent(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.userType !== 'STUDENT') {
    return res.status(403).json({ error: 'Access denied. Student role required.' });
  }

  return next();
}

// Middleware to check if user is a teacher
export function isTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.userType !== 'TEACHER') {
    return res.status(403).json({ error: 'Access denied. Teacher role required.' });
  }

  return next();
}

// Middleware to check if the user is the specific student for the request
export function isSpecificStudent(studentIdParam: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const studentId = req.params[studentIdParam];

    // Allow if user is the student in question
    if (req.user.userType === 'STUDENT' && req.user.id === studentId) {
      return next();
    }

    // Also allow if user is a teacher (for certain operations they might need)
    if (req.user.userType === 'TEACHER') {
      return next();
    }

    return res.status(403).json({ error: 'Access denied. Not authorized for this student data.' });
  };
} 