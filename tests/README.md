# Lessons Marketplace - Test Suite

This directory contains end-to-end tests for the Lessons Marketplace application using Playwright.

## Structure

The tests are organized into several directories:

- `auth/`: Tests for authentication (login/registration)
- `student/`: Tests for student user flows (lesson requests)
- `teacher/`: Tests for teacher user flows (rate management, quote submission)
- `e2e/`: End-to-end tests that cover complete flows across both user types
- `utils/`: Helper functions and test data
- `examples/`: Example test patterns and helpers

## Setup

The tests require Playwright to be installed:

```bash
# Install dependencies (including Playwright)
pnpm install

# Install Playwright browsers (if needed)
npx playwright install chromium
```

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
pnpm test

# Run tests in UI mode with Playwright Test UI
pnpm test:ui

# Run tests in headed mode (visible browsers)
pnpm test:headed

# Run tests with the debugger
pnpm test:debug

# Run specific test groups
pnpm test:auth     # Authentication tests
pnpm test:student  # Student flow tests
pnpm test:teacher  # Teacher flow tests
pnpm test:e2e      # End-to-end flow tests
```

### Optimized Testing for Development

For faster feedback during test development:

```bash
# Fast test run (single worker, only Chrome)
pnpm test:fast

# Watch mode - automatically run tests when code changes
pnpm test:watch

# Clear saved authentication states
pnpm test:clear-auth
```

The test suite is configured to run only on Chrome for faster execution. This was a deliberate choice to optimize for feedback speed during development.

## Test Users

The test suite creates unique test users for each test run to avoid collisions:

- E2E tests: Use timestamped emails generated at runtime (e.g., `test_student_1648123456789@example.com`)
- Auth state tests: Use predefined users (credentials in `tests/utils/auth-state.ts`)

### Avoiding User Collisions

To prevent user creation failures due to existing accounts:

1. We use timestamped emails for E2E tests to ensure unique users each run
2. The `createTestUser` function handles when a user already exists
3. Authentication state is saved to speed up tests and avoid repeated logins

If you experience issues with user authentication in tests, run:

```bash
pnpm test:clear-auth
```

This will clear all saved authentication states and force tests to create new users.

## Adding New Tests

To add new tests:

1. Create a new test file in the appropriate directory with a `.spec.ts` extension
2. Import the necessary Playwright and utility functions
3. Structure your tests using `test.describe()` and `test()` functions
4. Use the helper functions in `utils/test-helpers.ts` for common operations

Example:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/test-helpers';

test.describe('My New Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a specific user type before each test
    await loginAs(page, 'STUDENT');
  });

  test('should do something specific', async ({ page }) => {
    // Test specific functionality
    await page.getByRole('button', { name: 'Some Button' }).click();
    await expect(page.getByText('Expected Result')).toBeVisible();
  });
});
```

### Using Auth State for Faster Tests

To reuse authentication state and avoid repeated logins:

```typescript
import { expect } from '@playwright/test';
import { test } from '../utils/auth-state';

test.describe('Auth State Example', () => {
  // This test automatically logs in as a student
  test('Student flow', async ({ studentPage }) => {
    await studentPage.goto('/lesson-request');
    // Test student functionality...
  });
  
  // This test automatically logs in as a teacher
  test('Teacher flow', async ({ teacherPage }) => {
    await teacherPage.goto('/teacher-dashboard');
    // Test teacher functionality...
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on the state from other tests
2. **Readability**: Use descriptive test names and comments
3. **Stability**: Use reliable selectors (roles, labels) instead of CSS selectors
4. **Performance**: Keep tests focused and efficient
5. **Error Handling**: Implement appropriate checks and error handling
6. **Speed**: Avoid unnecessary test steps and focus on testing core functionality
7. **Uniqueness**: Use unique identifiers for test data to avoid collisions

## Tips for Speed Optimization

1. **Focused Tests**: Use `.only` modifier during development to run only specific tests
   ```typescript
   test.only('should do something specific', async ({ page }) => {
     // Only this test will run
   });
   ```

2. **Skip Browser UI**: Use headless mode during CI and most development work to speed up tests

3. **Reuse Authentication**: Use the auth-state helper to avoid repeated logins
   ```typescript
   // Use pre-authenticated pages
   test('My test', async ({ studentPage }) => {
     // Already logged in as a student
   });
   ```

4. **Parallel Execution**: When running the full suite, let tests run in parallel

## Debugging

If tests are failing, you can:

1. Run with `--headed` to see the browser during execution
2. Run with `--debug` to enable the Playwright debugger
3. Add `await page.pause()` in your test to pause at a specific point
4. Check the HTML snapshots and screenshots in the test results
5. Clear auth states with `pnpm test:clear-auth` if authentication issues occur

## CI Integration

The tests are configured to run in CI environments. The Playwright configuration adjusts settings automatically when running in CI. 