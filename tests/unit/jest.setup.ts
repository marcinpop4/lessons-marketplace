// Jest setup file to run after environment is set up
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Enhance Node's global type definition to make TypeScript happy
declare global {
  namespace NodeJS {
    interface Global {
      fetch: typeof fetch;
    }
  }
}

// Mock Vite's import.meta.env for Jest tests
// Use type assertion to avoid TypeScript errors
(global as any).import = {
  meta: {
    env: {
      VITE_DEBUG: 'false',
      VITE_LOG_LEVEL: 'error',
      VITE_API_BASE_URL: 'https://api.test',
      MODE: 'test',
      // Add any other environment variables your tests need
    }
  }
}; 