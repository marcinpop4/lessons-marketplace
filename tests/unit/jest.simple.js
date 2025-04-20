/** 
 * Minimal Jest configuration for unit tests
 * This is a last resort if the regular config doesn't work.
 */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Use absolute path to avoid any resolution issues
  globals: {
    'ts-jest': {
      tsconfig: '/app/tsconfig.test.json'
    }
  },
  // Only run tests in the unit directory
  testMatch: [
    '**/unit/**/*.test.ts',
    '**/unit/**/*.spec.ts'
  ],
  verbose: true
}; 