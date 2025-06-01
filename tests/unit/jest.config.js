/** @type {import('ts-jest').JestConfigWithTsJest} */
// Unit test configuration
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = process.cwd();

// --- Direct path resolution ---
const tsConfigPath = path.resolve(projectRoot, 'tsconfig.json');
console.log(`[Unit Config] Using tsconfig path: ${tsConfigPath}`);

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Run setup file after env is set
  setupFilesAfterEnv: [
    './jest.setup.ts' // Path relative to this config file
  ],
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      diagnostics: {
        warnOnly: true,
        pretty: true,
        ignoreCodes: [2571, 2532],
      },
    }],
  },
  clearMocks: true,
  // Output coverage relative to project root, inside tests/coverage/
  coverageDirectory: "<rootDir>/../coverage/unit",
  coverageProvider: "v8",
  // Look for tests only within this directory (tests/unit) and its subdirectories
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  // Ignore non-unit test directories
  testPathIgnorePatterns: [
    '/node_modules/', 
    '/dist/'
  ],
  // Essential path aliases for tests
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
    '^@server/(.*)$': '<rootDir>/../../server/$1'
  },
  // Add verbose logging
  verbose: true
}; 