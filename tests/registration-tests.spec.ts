import { test, expect } from '@playwright/test';

// Helper function to generate a unique email
const generateUniqueEmail = () => {
  const timestamp = new Date().getTime();
  return `test.user.${timestamp}@example.com`;
};

// Helper function to attempt registration
async function attemptRegistration(page, userData) {
  // Navigate to auth page and wait for the app to be ready
  await page.goto('/auth');
  
  // Wait for the app to be ready
  await page.waitForSelector('.auth-form', { timeout: 2000 });
  
  // Switch to registration form
  await page.click('button.auth-tab:has-text("Register")', { timeout: 2000 });
  
  // Wait for the registration form to be visible
  await expect(page.locator('form')).toBeVisible({ timeout: 2000 });
  
  // Fill in the registration form
  await page.fill('#firstName', userData.firstName, { timeout: 2000 });
  await page.fill('#lastName', userData.lastName, { timeout: 2000 });
  await page.fill('#email', userData.email, { timeout: 2000 });
  await page.fill('#password', userData.password, { timeout: 2000 });
  await page.fill('#confirmPassword', userData.password, { timeout: 2000 });
  await page.fill('#phoneNumber', userData.phoneNumber, { timeout: 2000 });
  await page.fill('#dateOfBirth', userData.dateOfBirth, { timeout: 2000 });
  
  // Select user type
  if (userData.userType === 'TEACHER') {
    await page.click('input[value="TEACHER"]', { timeout: 2000 });
  }
  
  // Submit the form
  await page.locator('form button[type="submit"]').click();
  
  // Wait for either a navigation to a dashboard or an error message
  const expectedPath = userData.userType === 'TEACHER' ? '/teacher-dashboard' : '/lesson-request';
  
  await Promise.race([
    page.waitForURL(new RegExp(`.*${expectedPath}.*`), { timeout: 2000 }),
    page.waitForSelector('.alert-error', { timeout: 2000 })
  ]);
  
  // Check if there's an error message
  const errorMessage = page.locator('.alert-error');
  const hasError = await errorMessage.isVisible();
  let errorText = null;
  
  if (hasError) {
    errorText = await errorMessage.textContent();
    console.log(`Registration error: ${errorText}`);
  }
  
  return { success: !hasError, errorText };
}

test('Student registration with new credentials succeeds', async ({ page }) => {
  const newUserData = {
    firstName: 'Test',
    lastName: 'User',
    email: generateUniqueEmail(),
    password: 'testpass123',
    phoneNumber: '123-456-7890',
    dateOfBirth: '2000-01-01',
    userType: 'STUDENT'
  };
  
  // Attempt registration
  const result = await attemptRegistration(page, newUserData);
  
  // Take a screenshot
  await page.screenshot({ path: 'tests/screenshots/student-registration.png' });
  
  // Check if registration was successful
  expect(result.success).toBe(true);
  
  // Additional check: verify we're on the lesson request page
  await expect(page).toHaveURL(/.*\/lesson-request.*/, { timeout: 2000 });
});

test('Student registration with existing email fails', async ({ page }) => {
  const existingUserData = {
    firstName: 'Ethan',
    lastName: 'Parker',
    email: 'ethan.parker@example.com', // This email exists in seeds
    password: 'testpass123',
    phoneNumber: '123-456-7890',
    dateOfBirth: '2000-01-01',
    userType: 'STUDENT'
  };
  
  // Attempt registration
  const result = await attemptRegistration(page, existingUserData);
  
  // Take a screenshot
  await page.screenshot({ path: 'tests/screenshots/student-registration-existing-email.png' });
  
  // Registration should fail with appropriate error
  expect(result.success).toBe(false);
  
  // Verify we're still on the auth page
  await expect(page).toHaveURL('/auth', { timeout: 2000 });
});

test('Teacher registration with new credentials succeeds', async ({ page }) => {
  const newUserData = {
    firstName: 'Test',
    lastName: 'Teacher',
    email: generateUniqueEmail(),
    password: 'testpass123',
    phoneNumber: '123-456-7890',
    dateOfBirth: '2000-01-01',
    userType: 'TEACHER'
  };
  
  // Attempt registration
  const result = await attemptRegistration(page, newUserData);
  
  // Take a screenshot
  await page.screenshot({ path: 'tests/screenshots/teacher-registration.png' });
  
  // Check if registration was successful
  expect(result.success).toBe(true);
  
  // Additional check: verify we're on the teacher dashboard
  await expect(page).toHaveURL(/.*\/teacher-dashboard.*/, { timeout: 2000 });
}); 