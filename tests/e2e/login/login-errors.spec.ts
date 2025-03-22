import { test, expect } from '@playwright/test';

/**
 * Authentication failure tests
 * These tests attempt to log in with various invalid scenarios and
 * verify that appropriate error messages are displayed.
 */

// Helper function to fill login form and submit
async function attemptLogin(page, email, password, userType = 'STUDENT') {
  // Go to the auth page and wait for the app to load
  await page.goto('/auth');
  
  // Wait for the app to be ready - look for the auth form
  await page.waitForSelector('.login-form', { state: 'visible', timeout: 2000 });
  
  // Make sure we're on the login tab (not register)
  const loginTab = page.locator('button.auth-tab', { hasText: 'Login' });
  if (await loginTab.isVisible()) {
    await loginTab.click();
  }
  
  // Wait for the form elements to be ready
  await page.waitForSelector('#email', { state: 'visible' });
  await page.waitForSelector('#password', { state: 'visible' });
  
  // Fill the login form
  await page.fill('#email', email);
  await page.waitForTimeout(100); // Small delay between inputs
  await page.fill('#password', password);
  await page.waitForTimeout(100); // Small delay between inputs
  
  // Select the user type radio button if needed
  if (userType === 'TEACHER') {
    await page.locator('input[value="TEACHER"]').check();
  } else {
    await page.locator('input[value="STUDENT"]').check();
  }
  
  // Submit the form without waiting for network response
  await page.locator('form button[type="submit"]').click();
  
  // Wait a bit for any error message to appear in the DOM
  await page.waitForTimeout(500);
}

test('Student login with incorrect password shows persistent error message', async ({ page }) => {
  // Valid email but wrong password
  const studentEmail = 'ethan.parker@example.com';
  const wrongPassword = 'wrong_password';
  
  console.log('Testing student login with incorrect password');
  await attemptLogin(page, studentEmail, wrongPassword, 'STUDENT');
  
  // Take a screenshot of the failed login
  await page.screenshot({ path: 'tests/screenshots/student-wrong-password.png' });
  
  console.log('Checking for error message...');
  
  // Check that an error message is displayed
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible({ timeout: 2000 });
  
  // Get the specific error message text
  const errorText = await errorMessage.textContent();
  console.log('Error message text:', errorText);
  
  // Verify the message is still visible after a delay
  await page.waitForTimeout(500);
  await expect(errorMessage).toBeVisible();
  
  console.log('Student login with incorrect password test completed');
});

test('Teacher login with incorrect password shows persistent error message', async ({ page }) => {
  // Valid email but wrong password
  const teacherEmail = 'olivia.thompson@example.com';
  const wrongPassword = 'wrong_password';
  
  console.log('Testing teacher login with incorrect password');
  await attemptLogin(page, teacherEmail, wrongPassword, 'TEACHER');
  
  // Take a screenshot of the failed login
  await page.screenshot({ path: 'tests/screenshots/teacher-wrong-password.png' });
  
  console.log('Checking for error message...');
  
  // Check that an error message is displayed
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible({ timeout: 2000 });
  
  // Get the specific error message text
  const errorText = await errorMessage.textContent();
  console.log('Error message text:', errorText);
  
  // Verify the message is still visible after a delay
  await page.waitForTimeout(500);
  await expect(errorMessage).toBeVisible();
  
  console.log('Teacher login with incorrect password test completed');
});

test('Login with non-existent email shows error message', async ({ page }) => {
  // Non-existent email
  const nonExistentEmail = 'nonexistent-user@example.com';
  const anyPassword = 'password123';
  
  console.log('Testing login with non-existent email');
  await attemptLogin(page, nonExistentEmail, anyPassword);
  
  // Take a screenshot of the failed login
  await page.screenshot({ path: 'tests/screenshots/non-existent-email.png' });
  
  console.log('Checking for error message...');
  
  // Check that an error message is displayed
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible({ timeout: 2000 });
  
  // Get the specific error message text
  const errorText = await errorMessage.textContent();
  console.log('Error message text:', errorText);
  
  // Verify the message is still visible after a delay
  await page.waitForTimeout(500);
  await expect(errorMessage).toBeVisible();
  
  console.log('Login with non-existent email test completed');
});

test('Student credentials with teacher userType shows appropriate error', async ({ page }) => {
  // Valid student credentials but trying to log in as teacher
  const studentEmail = 'ethan.parker@example.com';
  const studentPassword = '1234'; // Using the correct password from seed data
  
  console.log('Testing student credentials with teacher userType');
  await attemptLogin(page, studentEmail, studentPassword, 'TEACHER');
  
  // Take a screenshot of the failed login
  await page.screenshot({ path: 'tests/screenshots/student-as-teacher.png' });
  
  console.log('Checking for error message...');
  
  // Check that an error message is displayed
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible({ timeout: 2000 });
  
  // Get the specific error message text
  const errorText = await errorMessage.textContent();
  console.log('Error message text:', errorText);
  
  // Verify the message is still visible after a delay
  await page.waitForTimeout(500);
  await expect(errorMessage).toBeVisible();
  
  console.log('Student credentials with teacher userType test completed');
});

test('Teacher credentials with student userType shows appropriate error', async ({ page }) => {
  // Valid teacher credentials but trying to log in as student
  const teacherEmail = 'olivia.thompson@example.com';
  const teacherPassword = '1234'; // Using the correct password from seed data
  
  console.log('Testing teacher credentials with student userType');
  await attemptLogin(page, teacherEmail, teacherPassword, 'STUDENT');
  
  // Take a screenshot of the failed login
  await page.screenshot({ path: 'tests/screenshots/teacher-as-student.png' });
  
  console.log('Checking for error message...');
  
  // Check that an error message is displayed
  const errorMessage = page.locator('.alert-error');
  await expect(errorMessage).toBeVisible({ timeout: 2000 });
  
  // Get the specific error message text
  const errorText = await errorMessage.textContent();
  console.log('Error message text:', errorText);
  
  // Verify the message is still visible after a delay
  await page.waitForTimeout(500);
  await expect(errorMessage).toBeVisible();
  
  console.log('Teacher credentials with student userType test completed');
}); 