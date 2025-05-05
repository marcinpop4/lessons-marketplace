import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
// Import user creation utilities
import { createTestStudent, createTestTeacher } from '../../utils/user.utils';

/**
 * Authentication failure tests
 * These tests attempt to log in with various invalid scenarios and
 * verify that appropriate error messages are displayed.
 */

// Helper function to fill login form and submit
async function attemptLogin(
  page: Page,
  email: string,
  password: string,
  userType: 'STUDENT' | 'TEACHER' = 'STUDENT'
) {
  // Go to the login page and wait for the app to load
  await page.goto('/login');
  await expect(page.locator('form')).toBeVisible();

  // Fill the login form
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  // Select the user type radio button if needed
  if (userType === 'TEACHER') {
    await page.locator('input[value="TEACHER"]').check();
  } else {
    await page.locator('input[value="STUDENT"]').check();
  }

  // Submit the form and wait for error message
  await Promise.all([
    page.waitForResponse(
      (response: Response) => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
    ),
    page.locator('form button[type="submit"]').click()
  ]);
}

test('Student login with incorrect password shows error message', async ({ page }) => {
  // --- Test Setup ---
  const { user: student } = await createTestStudent();
  if (!student || !student.email) {
    throw new Error('Failed to create test student');
  }
  // --- End Test Setup ---

  // Go to the login page
  await page.goto('/login');

  // Fill the login form with correct email but incorrect password
  await page.getByLabel('Email').fill(student.email);
  await page.getByLabel('Password').fill('wrongpassword');

  // Submit the form
  await page.locator('form button[type="submit"]').click();

  // Verify error message
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Invalid credentials/i);

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('Teacher login with incorrect password shows error message', async ({ page }) => {
  // --- Test Setup ---
  const { user: teacher } = await createTestTeacher();
  if (!teacher || !teacher.email) {
    throw new Error('Failed to create test teacher');
  }
  // --- End Test Setup ---

  // Go to the login page
  await page.goto('/login');

  // Fill the login form with correct email but incorrect password
  await page.getByLabel('Email').fill(teacher.email);
  await page.getByLabel('Password').fill('wrongpassword');
  await page.locator('input[value="TEACHER"]').check();

  // Submit the form
  await page.locator('form button[type="submit"]').click();

  // Verify error message
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Invalid credentials/i);

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('Login with non-existent email shows error message', async ({ page }) => {
  // No user creation needed for this test
  // Go to the login page
  await page.goto('/login');

  // Fill the login form with non-existent email
  await page.getByLabel('Email').fill('nonexistent.' + Date.now() + '@example.com'); // Use unique non-existent email
  await page.getByLabel('Password').fill('123456'); // Use a valid length password

  // Submit the form
  await page.locator('form button[type="submit"]').click();

  // Verify error message
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Invalid credentials/i);

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('Student credentials with teacher userType shows error', async ({ page }) => {
  // --- Test Setup ---
  const { user: student, password } = await createTestStudent();
  if (!student || !student.email || !password) {
    throw new Error('Failed to create test student');
  }
  // --- End Test Setup ---

  // Go to the login page
  await page.goto('/login');

  // Fill the login form with student credentials but teacher type
  await page.getByLabel('Email').fill(student.email);
  await page.getByLabel('Password').fill(password); // Use the correct password
  await page.locator('input[value="TEACHER"]').check();

  // Submit the form
  await page.locator('form button[type="submit"]').click();

  // Verify error message
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Invalid credentials/i); // Or specific message if backend differentiates

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('Teacher credentials with student userType shows error', async ({ page }) => {
  // --- Test Setup ---
  const { user: teacher, password } = await createTestTeacher();
  if (!teacher || !teacher.email || !password) {
    throw new Error('Failed to create test teacher');
  }
  // --- End Test Setup ---

  // Go to the login page
  await page.goto('/login');

  // Fill the login form with teacher credentials but student type
  await page.getByLabel('Email').fill(teacher.email);
  await page.getByLabel('Password').fill(password); // Use the correct password
  await page.locator('input[value="STUDENT"]').check();

  // Submit the form
  await page.locator('form button[type="submit"]').click();

  // Verify error message
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Invalid credentials/i); // Or specific message if backend differentiates

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('should show error for empty email', async ({ page }) => {
  // No user creation needed, tests HTML validation
  // Go to the login page
  await page.goto('/login');

  // Get the email input and form
  const emailInput = page.getByLabel('Email');
  const form = page.locator('form');

  // Try to submit without email
  await page.getByLabel('Password').fill('somepassword'); // Fill password to focus on email validation
  await form.evaluate((f: HTMLFormElement) => f.requestSubmit()); // Use requestSubmit to trigger form validation

  // Verify the input is invalid using HTML5 validation state
  const isValid = await emailInput.evaluate((e: HTMLInputElement) => e.validity.valid);
  expect(isValid).toBe(false);

  // Verify validation message
  const validationMessage = await emailInput.evaluate((e: HTMLInputElement) => e.validationMessage);
  expect(validationMessage).toBeTruthy(); // e.g., "Please fill out this field."

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('should show error for empty password', async ({ page }) => {
  // No user creation needed, tests HTML validation
  // Go to the login page
  await page.goto('/login');

  // Get the password input and form
  const passwordInput = page.getByLabel('Password');
  const form = page.locator('form');

  // Fill email but leave password empty
  await page.getByLabel('Email').fill('test@example.com');
  await form.evaluate((f: HTMLFormElement) => f.requestSubmit()); // Use requestSubmit to trigger form validation

  // Verify the input is invalid using HTML5 validation state
  const isValid = await passwordInput.evaluate((e: HTMLInputElement) => e.validity.valid);
  expect(isValid).toBe(false);

  // Verify validation message
  const validationMessage = await passwordInput.evaluate((e: HTMLInputElement) => e.validationMessage);
  expect(validationMessage).toBeTruthy(); // e.g., "Please fill out this field."

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('should show error for invalid email format', async ({ page }) => {
  // No user creation needed, tests HTML validation
  // Go to the login page
  await page.goto('/login');

  // Get the email input
  const emailInput = page.getByLabel('Email');

  // Fill with invalid email format
  await emailInput.fill('invalid-email');
  await page.getByLabel('Password').click(); // Click away to trigger validation if implemented

  // Check HTML5 validation message
  const validationMessage = await emailInput.evaluate((e: HTMLInputElement) => e.validationMessage);
  expect(validationMessage).toContain("Please include an '@' in the email address");

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
});

test('should show error for too short password', async ({ page }) => {
  // --- Test Setup ---
  // Create a user just to have a valid email for the attempt
  const { user: student } = await createTestStudent();
  if (!student || !student.email) {
    throw new Error('Failed to create test student');
  }
  // --- End Test Setup ---

  // Go to the login page
  await page.goto('/login');

  // Fill with valid email but too short password
  await page.getByLabel('Email').fill(student.email);
  await page.getByLabel('Password').fill('123');

  // Submit the form
  await page.locator('form button[type="submit"]').click();

  // Verify error message (Backend should return 'Invalid credentials' even for short passwords)
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/Invalid credentials/i);

  // Verify we're still on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
}); 