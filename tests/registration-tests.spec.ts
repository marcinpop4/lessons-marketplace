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
  
  // Wait for the app to be ready (React logo to be loaded)
  await page.waitForSelector('img[src*="lessons-marketplace"]', { timeout: 2000 });
  
  // Switch to registration form
  await page.click('button:text("Register")', { timeout: 2000 });
  
  // Wait for the registration form to be visible
  await expect(page.locator('.register-form')).toBeVisible({ timeout: 2000 });
  
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
  
  // Submit the form first
  const form = page.locator('.register-form');
  const submitButton = form.locator('button[type="submit"]');
  
  // Wait for network responses
  const [registrationResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith('/api/auth/register') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    submitButton.click()
  ]);
  
  // Only wait for user data response if registration was successful
  let userDataResponse = null;
  if (registrationResponse.status() === 201) {
    userDataResponse = await page.waitForResponse(
      response => response.url().endsWith('/api/auth/me') && response.request().method() === 'GET',
      { timeout: 2000 }
    );
    
    // Wait for navigation to complete based on user type
    const expectedPath = userData.userType === 'TEACHER' ? '/teacher-dashboard' : '/lesson-request';
    await page.waitForURL(new RegExp(`.*${expectedPath}.*`), { timeout: 2000 });
  }
  
  return { registrationResponse, userDataResponse };
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
  
  // Navigate to auth page and fill in the form
  await page.goto('/auth');
  
  // Wait for the app to be ready (React logo to be loaded)
  await page.waitForSelector('img[src*="lessons-marketplace"]', { timeout: 2000 });
  
  // Switch to registration form
  await page.click('button:text("Register")', { timeout: 2000 });
  
  // Wait for the registration form to be visible
  await expect(page.locator('.register-form')).toBeVisible({ timeout: 2000 });
  
  // Fill in the registration form
  await page.fill('#firstName', newUserData.firstName, { timeout: 2000 });
  await page.fill('#lastName', newUserData.lastName, { timeout: 2000 });
  await page.fill('#email', newUserData.email, { timeout: 2000 });
  await page.fill('#password', newUserData.password, { timeout: 2000 });
  await page.fill('#confirmPassword', newUserData.password, { timeout: 2000 });
  await page.fill('#phoneNumber', newUserData.phoneNumber, { timeout: 2000 });
  await page.fill('#dateOfBirth', newUserData.dateOfBirth, { timeout: 2000 });
  
  // Wait for network responses and navigation
  const [registrationResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith('/api/auth/register') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.register-form button[type="submit"]').click()
  ]);
  
  // Verify student registration was successful
  expect(registrationResponse.status()).toBe(201);
  
  // Wait for navigation to lesson request page
  await page.waitForURL(/.*\/lesson-request.*/, { timeout: 2000 });
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
  
  const { registrationResponse } = await attemptRegistration(page, existingUserData);
  
  // Verify registration failed with 409
  expect(registrationResponse.status()).toBe(409);
  
  // Wait for error message
  await expect(page.locator('.error-message')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.error-message')).toContainText('Email already exists', { timeout: 2000 });
  
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
  
  // Navigate to auth page and fill in the form
  await page.goto('/auth');
  
  // Wait for the app to be ready (React logo to be loaded)
  await page.waitForSelector('img[src*="lessons-marketplace"]', { timeout: 2000 });
  
  // Switch to registration form
  await page.click('button:text("Register")', { timeout: 2000 });
  
  // Wait for the registration form to be visible
  await expect(page.locator('.register-form')).toBeVisible({ timeout: 2000 });
  
  // Fill in the registration form
  await page.fill('#firstName', newUserData.firstName, { timeout: 2000 });
  await page.fill('#lastName', newUserData.lastName, { timeout: 2000 });
  await page.fill('#email', newUserData.email, { timeout: 2000 });
  await page.fill('#password', newUserData.password, { timeout: 2000 });
  await page.fill('#confirmPassword', newUserData.password, { timeout: 2000 });
  await page.fill('#phoneNumber', newUserData.phoneNumber, { timeout: 2000 });
  await page.fill('#dateOfBirth', newUserData.dateOfBirth, { timeout: 2000 });
  
  // Select teacher user type
  await page.click('input[value="TEACHER"]', { timeout: 2000 });
  
  // Wait for network responses and navigation
  const [registrationResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith('/api/auth/register') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.register-form button[type="submit"]').click()
  ]);
  
  // Verify teacher registration was successful
  expect(registrationResponse.status()).toBe(201);
  
  // Wait for navigation to teacher dashboard 
  await page.waitForURL(/.*\/teacher-dashboard.*/, { timeout: 2000 });
}); 