import { test, expect, Page } from '@playwright/test';

// Helper function to generate a unique email
const generateUniqueEmail = (): string => {
  const timestamp = new Date().getTime();
  return `test.user.${timestamp}@example.com`;
};

// Helper function to attempt registration
async function attemptRegistration(page: Page, email: string, password: string, userType: 'STUDENT' | 'TEACHER') {
  // Go to register page
  await page.goto('/register');
  
  // Wait for form to be ready
  const form = page.locator('form');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.locator('#registerPassword');
  const confirmPasswordInput = page.locator('#confirmPassword');
  const firstNameInput = page.getByLabel('First Name');
  const lastNameInput = page.getByLabel('Last Name');
  const phoneInput = page.getByLabel('Phone Number');
  const dobInput = page.getByLabel('Date of Birth');
  const userTypeRadio = page.locator(`#${userType.toLowerCase()}Type`);
  const submitButton = form.getByRole('button', { name: /register/i });
  
  // Wait for all form elements to be visible
  await Promise.all([
    expect(form).toBeVisible(),
    expect(emailInput).toBeVisible(),
    expect(passwordInput).toBeVisible(),
    expect(confirmPasswordInput).toBeVisible(),
    expect(firstNameInput).toBeVisible(),
    expect(lastNameInput).toBeVisible(),
    expect(phoneInput).toBeVisible(),
    expect(dobInput).toBeVisible(),
    expect(userTypeRadio).toBeVisible(),
    expect(submitButton).toBeVisible()
  ]);
  
  // Fill the form
  await firstNameInput.fill('Test');
  await lastNameInput.fill('User');
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await confirmPasswordInput.fill(password);
  await phoneInput.fill('123-456-7890');
  await dobInput.fill('2000-01-01');
  await userTypeRadio.check();
  
  // Set up response promise before clicking
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/v1/auth/register') && response.request().method() === 'POST'
  );
  
  // Submit form
  await submitButton.click();
  
  // Wait for response
  const response = await responsePromise;
  const status = response.status();
  
  // Get error message if present
  let errorText = '';
  if (status !== 201) {
    const errorMessage = page.locator('.alert-error');
    await expect(errorMessage).toBeVisible();
    errorText = await errorMessage.textContent() || '';
  }
  
  return {
    success: status === 201,
    errorText,
    status
  };
}

test('Student registration with new credentials succeeds', async ({ page }) => {
  // Generate unique email
  const uniqueEmail = `student${Date.now()}@example.com`;
  
  // Attempt registration with valid password (8+ characters)
  const result = await attemptRegistration(page, uniqueEmail, 'password123', 'STUDENT');
  
  // Registration should succeed
  expect(result.success).toBe(true);
  
  // Should be redirected to lesson request page
  await expect(page).toHaveURL(/.*\/lesson-request.*/);
});

test('Student registration with existing email fails', async ({ page }) => {
  // Use an email that already exists in seed data
  const existingEmail = 'ethan.parker@example.com';
  
  // Attempt registration with valid password (8+ characters)
  const result = await attemptRegistration(page, existingEmail, 'password123', 'STUDENT');
  
  // Registration should fail with appropriate error
  expect(result.success).toBe(false);
  expect(result.status).toBe(409); // Conflict status code
  expect(result.errorText).toMatch(/unexpected error|already exists/i);
  
  // Verify we're still on the register page
  await expect(page).toHaveURL('/register');
});

test('Teacher registration with new credentials succeeds', async ({ page }) => {
  // Generate unique email
  const uniqueEmail = `teacher${Date.now()}@musicschool.com`;
  
  // Attempt registration with valid password (8+ characters)
  const result = await attemptRegistration(page, uniqueEmail, 'password123', 'TEACHER');
  
  // Registration should succeed
  expect(result.success).toBe(true);
  
  // Should be redirected to teacher dashboard
  await expect(page).toHaveURL(/.*\/teacher-dashboard.*/);
}); 