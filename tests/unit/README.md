# Unit Tests

This directory contains all unit tests for the application.

## Structure

```
tests/unit/
├── mocks/              # Mock files for testing
│   ├── fileMock.js     # Mock for image and asset files
│   └── styleMock.js    # Mock for CSS files
├── setup.ts            # Main setup file for Jest
├── jest.setup.ts       # Setup file that runs after test environment is set up
└── api/                # Tests for API clients
    └── ...
```

## Running Tests

```bash
# Run all unit tests
pnpm test

# Run specific unit tests
pnpm test:unit
```

## Writing Tests

1. Create files with the `.test.ts` or `.spec.ts` extension
2. Group tests by module/functionality in appropriate subdirectories
3. Follow TypeScript best practices with proper typing

### Example Test

```typescript
// Example: tests/unit/utils/formatter.test.ts
import { formatCurrency } from '../../../utils/formatter';

describe('formatCurrency', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1000.5)).toBe('$1,000.50');
  });
});
```

## Dependencies

The project uses:
- Jest as the test runner
- ts-jest for TypeScript support
- @testing-library/jest-dom for DOM testing utilities

## Configuration

All Jest configuration is centralized in:
- `jest.config.js` - Main Jest configuration
- `tests/unit/setup.ts` - Global setup
- `tests/unit/jest.setup.ts` - Test framework setup 