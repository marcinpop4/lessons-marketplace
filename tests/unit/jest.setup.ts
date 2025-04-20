// Jest setup file to run after environment is set up
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
// Use require for built-in Node modules in Jest setup
const path = require('path');
const fs = require('fs');
import { fileURLToPath } from 'url';

// Explicitly check if path is loaded before using it
if (!path || typeof path.resolve !== 'function') {
  console.error('[Unit Tests Setup] FATAL: path module not loaded correctly!');
  process.exit(1); // Exit immediately if path is not available
}

// Check if tsconfig exists - helps diagnose issues
const testTsConfigPath = path.resolve(process.cwd(), 'tests/tsconfig.test.json');
const rootTsConfigPath = path.resolve(process.cwd(), 'tsconfig.test.json');

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