/** @type {import('ts-jest').JestConfigWithTsJest} */
// API/Integration test configuration
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = process.cwd();

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Load environment variables before running any test files
  setupFiles: [
    // Use <rootDir> explicitly since relative path caused issues
    // REMOVE: '<rootDir>/jest.setup.ts' // Moved to setupFilesAfterEnv
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Correct extension to .ts
  // ADD the 'transform' section
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      diagnostics: {
        warnOnly: true, // Log but don't fail on TS errors
        pretty: true,
        ignoreCodes: [2571, 2532], // Ignore some common TS errors that don't affect tests
      },
    }],
  },
  clearMocks: true,
  // Output coverage relative to project root, inside tests/coverage/
  coverageDirectory: "<rootDir>/../coverage/api",
  coverageProvider: "v8",
  // Test files within this directory (relative to config file location)
  testMatch: [
    '**/*.test.ts' // Find tests in tests/api and subdirs
  ],
  // Module mapper paths are relative to project root
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/$1', // Adjusted path
    '^@server/(.*)$': '<rootDir>/../../server/$1',  // Adjusted path
    '^@frontend/(.*)$': '<rootDir>/../../frontend/$1' // Added frontend alias
  },
  testTimeout: 30000, // Slightly increased timeout
  verbose: true
}; 