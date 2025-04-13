/** @type {import('ts-jest').JestConfigWithTsJest} */
// Unit test configuration
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Run setup file after env is set
  setupFilesAfterEnv: [
    './jest.setup.ts' // Path relative to this config file
  ],
  clearMocks: true,
  // Output coverage relative to project root
  coverageDirectory: "<rootDir>/../../coverage/unit",
  coverageProvider: "v8",
  // Look for tests only within this directory (tests/unit) and its subdirectories
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  // Ignore non-unit test directories (relative to project root)
  // This might be redundant now but doesn't hurt
  testPathIgnorePatterns: [
    '/node_modules/', 
    '/dist/',
    // These paths assume <rootDir> is the project root, which might be inconsistent
    // Let's remove them for now as testMatch is scoped
    // '<rootDir>/tests/api/',  
    // '<rootDir>/tests/e2e/'  
  ],
  // Module mapper paths are relative to project root (<rootDir> is tests/unit here)
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/$1', // Adjusted path
    '^@server/(.*)$': '<rootDir>/../../server/$1'  // Adjusted path
  },
}; 