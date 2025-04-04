// jest.config.js
export default {
  // Use ts-jest for TypeScript files
  preset: 'ts-jest',
  
  // Set the test environment (jsdom for browser-like environment)
  testEnvironment: 'jsdom',
  
  // Make Jest functions (describe, test, expect) available globally
  injectGlobals: true,
  
  // Handle module imports and file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Configure module name mapper for CSS modules and other assets
  moduleNameMapper: {
    // Handle CSS and asset imports
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/unit/mocks/styleMock.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/unit/mocks/fileMock.js',
    
    // Mock the frontend logger
    '^frontend/utils/logger$': '<rootDir>/tests/unit/mocks/logger.mock.ts',
    '^@frontend/utils/logger$': '<rootDir>/tests/unit/mocks/logger.mock.ts',
    
    // Path aliases matching tsconfig.json
    '^@frontend$': '<rootDir>/frontend',
    '^@frontend/(.*)$': '<rootDir>/frontend/$1',
    '^@frontend/api/(.*)$': '<rootDir>/frontend/api/$1',
    '^@frontend/components/(.*)$': '<rootDir>/frontend/components/$1',
    '^@frontend/contexts/(.*)$': '<rootDir>/frontend/contexts/$1',
    '^@frontend/hooks/(.*)$': '<rootDir>/frontend/hooks/$1',
    '^@frontend/pages/(.*)$': '<rootDir>/frontend/pages/$1',
    '^@frontend/styles/(.*)$': '<rootDir>/frontend/styles/$1',
    '^@frontend/theme/(.*)$': '<rootDir>/frontend/theme/$1',
    '^@frontend/types/(.*)$': '<rootDir>/frontend/types/$1',
    '^@frontend/utils/(.*)$': '<rootDir>/frontend/utils/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@config/(.*)$': '<rootDir>/frontend/config/$1',
    
    // Standard module paths
    '^frontend/(.*)$': '<rootDir>/frontend/$1',
    '^server/(.*)$': '<rootDir>/server/$1',
    '^shared/(.*)$': '<rootDir>/shared/$1'
  },
  
  // Transform files using ts-jest and our custom transformer for Vite code
  transform: {
    // Use our custom transformer for any file that might use import.meta.env
    '^.+\\.(js|jsx|ts|tsx)$': [
      'ts-jest',
      {
        // Use this config because our project is ESM
        useESM: true,
        // Point to the tsconfig for tests
        tsconfig: 'tsconfig.json'
      }
    ]
  },
  
  // Define test patterns - focus on unit tests
  testMatch: [
    '<rootDir>/tests/unit/**/*.(spec|test).(js|jsx|ts|tsx)'
  ],
  
  // Setup files to run before tests
  setupFiles: ['<rootDir>/tests/unit/setup.ts'],
  
  // Setup files after environment is setup
  setupFilesAfterEnv: ['<rootDir>/tests/unit/jest.setup.ts'],
  
  // Extension for ESM support since we're using Vite
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  
  // Exclude e2e tests that use Playwright
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/'
  ],
  
  // Resolve package.json naming collision
  modulePathIgnorePatterns: [
    '<rootDir>/frontend/package.json',
    '<rootDir>/server/package.json'
  ],
  
  // For resolving modules
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Enable ES modules support
  transformIgnorePatterns: [
    'node_modules/(?!(tsconfig-paths|dotenv)/)'
  ]
}; 