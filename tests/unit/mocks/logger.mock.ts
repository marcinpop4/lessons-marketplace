/**
 * Mock implementation of the frontend logger
 */
import { jest } from '@jest/globals';

// Export default logger instance with mocked methods
export default {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLogLevel: jest.fn(),
  getLogLevel: jest.fn()
};

// Export the LogLevel enum to match the interface of the real logger
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
} 