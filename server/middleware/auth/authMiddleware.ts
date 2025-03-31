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
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, secretKey) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
    return;
  }
}

// Middleware to check if user is a student
export function isStudent(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.user.userType !== 'STUDENT') {
    res.status(403).json({ error: 'Access denied. Student role required.' });
    return;
  }

  next();
}

// Middleware to check if user is a teacher
export function isTeacher(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.user.userType !== 'TEACHER') {
    res.status(403).json({ error: 'Access denied. Teacher role required.' });
    return;
  }

  next();
}

// Middleware to check if the user is the specific student for the request
export function isSpecificStudent(studentIdParam: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const studentId = req.params[studentIdParam];

    // Allow if user is the student in question
    if (req.user.userType === 'STUDENT' && req.user.id === studentId) {
      next();
      return;
    }

    // Also allow if user is a teacher (for certain operations they might need)
    if (req.user.userType === 'TEACHER') {
      next();
      return;
    }

    res.status(403).json({ error: 'Access denied. Not authorized for this student data.' });
    return;
  };
} 