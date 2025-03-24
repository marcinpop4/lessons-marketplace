// Setup file for Jest tests - runs before tests start
import { jest } from '@jest/globals';

// Setup global browser API mocks
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
} as unknown as Storage;

// Simple window mock - cast as any to avoid type errors
// We only need this for basic properties to make some tests pass
global.window = {
  location: {
    href: '',
    pathname: ''
  }
} as any;

// Create a function to set environment variables
function setViteEnv(env: Record<string, string>) {
  // Define the global variable that our transformer will use
  (global as any).__VITE_ENV__ = env;
  
  // Also set it on import.meta.env for backward compatibility
  (global as any).import = {
    meta: { env }
  };
  
  (globalThis as any).import = {
    meta: { env }
  };
}

// Default test environment
setViteEnv({
  MODE: 'test',
  VITE_TEST_MODE: 'true',
  VITE_API_BASE_URL: 'https://api.test',
  VITE_DEBUG: 'false',
  VITE_LOG_LEVEL: 'error',
  VITE_SOME_OTHER_VAR: 'test'
});

// Export the function for tests to use
(global as any).setViteEnv = setViteEnv;

// Setup fetch mock
global.fetch = jest.fn() as unknown as typeof fetch; 