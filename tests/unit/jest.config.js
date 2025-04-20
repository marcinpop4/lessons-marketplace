/** @type {import('ts-jest').JestConfigWithTsJest} */
// Unit test configuration
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = process.cwd();

// --- Direct path resolution ---
const tsConfigPath = path.resolve(projectRoot, 'tests/tsconfig.test.json');
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
      tsconfig: tsConfigPath,
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
  // Module mapper paths are relative to project root (<rootDir> is tests/unit here)
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/$1', // Adjusted path
    '^@server/(.*)$': '<rootDir>/../../server/$1'  // Adjusted path
  },
  // Add verbose logging
  verbose: true
}; 