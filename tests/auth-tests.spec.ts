import { test, expect } from '@playwright/test';

/**
 * Simple authentication tests
 * These tests fill the login form, submit it, and take screenshots
 * without waiting for redirects or checking any content.
 */

test('Student login form submission', async ({ page }) => {
  // Go to the auth page
  console.log('Navigating to the auth page');
  await page.goto('/auth');
  
  // Take a screenshot before login
  await page.screenshot({ path: 'tests/screenshots/student-before-login.png' });
  
  // Make sure we're on the login tab (not register)
  console.log('Ensuring we are on the login tab');
  const loginTab = page.locator('button.auth-tab', { hasText: 'Login' });
  if (await loginTab.isVisible()) {
    await loginTab.click();
  }
  
  // Use a student from seed data
  const studentEmail = 'ethan.parker@example.com';
  const password = '1234';
  
  console.log(`Filling form as student: ${studentEmail}`);
  
  // Fill the login form
  await page.getByLabel('Email').fill(studentEmail);
  await page.getByLabel('Password').fill(password);
  
  // Submit the form and wait for API response
  console.log('Submitting login form');
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('form button[type="submit"]').click()
  ]);
  
  // Take a screenshot after submission
  await page.screenshot({ path: 'tests/screenshots/student-after-login.png' });
  
  console.log('Student login form submitted');
});

test('Teacher login form submission', async ({ page }) => {
  // Go to the auth page
  console.log('Navigating to the auth page');
  await page.goto('/auth');
  
  // Take a screenshot before login
  await page.screenshot({ path: 'tests/screenshots/teacher-before-login.png' });
  
  // Make sure we're on the login tab (not register)
  console.log('Ensuring we are on the login tab');
  const loginTab = page.locator('button.auth-tab', { hasText: 'Login' });
  if (await loginTab.isVisible()) {
    await loginTab.click();
  }
  
  // Use a teacher from seed data
  const teacherEmail = 'emily.richardson@musicschool.com';
  const password = '1234';
  
  console.log(`Filling form as teacher: ${teacherEmail}`);
  
  // Fill the login form
  await page.getByLabel('Email').fill(teacherEmail);
  await page.getByLabel('Password').fill(password);
  
  // Select the teacher radio button
  await page.locator('input[name="userType"][value="TEACHER"]').check();
  
  // Submit the form and wait for API response
  console.log('Submitting login form');
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('form button[type="submit"]').click()
  ]);
  
  // Take a screenshot after submission
  await page.screenshot({ path: 'tests/screenshots/teacher-after-login.png' });
  
  console.log('Teacher login form submitted');
}); 