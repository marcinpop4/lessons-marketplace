import { test, expect } from '@playwright/test';

/**
 * Simple authentication tests
 * These tests fill the login form, submit it, and verify successful login
 */

test('Student login form submission', async ({ page }) => {
  // Go to the login page
  await page.goto('/login');
  
  // Get form elements
  const form = page.locator('form');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');
  const studentRadio = page.locator('input[value="STUDENT"]');
  const submitButton = form.getByRole('button', { name: /login/i });
  
  // Wait for form to be ready
  await Promise.all([
    expect(form).toBeVisible(),
    expect(emailInput).toBeVisible(),
    expect(passwordInput).toBeVisible(),
    expect(studentRadio).toBeVisible(),
    expect(submitButton).toBeVisible()
  ]);
  
  // Fill the login form
  await emailInput.fill('ethan.parker@example.com');
  await passwordInput.fill('1234');
  await studentRadio.check();
  
  // Set up response promise before clicking
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
  );
  
  // Submit form
  await submitButton.click();
  
  // Wait for response
  const response = await responsePromise;
  const status = response.status();
  
  // If login successful, wait for redirect
  if (status === 200) {
    await expect(page).toHaveURL(/.*\/lesson-request.*/, { timeout: 2000 });
  } else {
    // If login failed, verify error message
    const errorMessage = page.locator('.alert-error');
    await expect(errorMessage).toBeVisible();
    throw new Error(`Login failed with status ${status}`);
  }
});

test('Teacher login form submission', async ({ page }) => {
  // Go to the login page
  await page.goto('/login');
  
  // Get form elements
  const form = page.locator('form');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');
  const teacherRadio = page.locator('input[value="TEACHER"]');
  const submitButton = form.getByRole('button', { name: /login/i });
  
  // Wait for form to be ready
  await Promise.all([
    expect(form).toBeVisible(),
    expect(emailInput).toBeVisible(),
    expect(passwordInput).toBeVisible(),
    expect(teacherRadio).toBeVisible(),
    expect(submitButton).toBeVisible()
  ]);
  
  // Fill the login form
  await emailInput.fill('emily.richardson@musicschool.com');
  await passwordInput.fill('1234');
  await teacherRadio.check();
  
  // Set up response promise before clicking
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
  );
  
  // Submit form
  await submitButton.click();
  
  // Wait for response
  const response = await responsePromise;
  const status = response.status();
  
  // If login successful, wait for redirect
  if (status === 200) {
    await expect(page).toHaveURL(/.*\/teacher-dashboard.*/, { timeout: 2000 });
  } else {
    // If login failed, verify error message
    const errorMessage = page.locator('.alert-error');
    await expect(errorMessage).toBeVisible();
    throw new Error(`Login failed with status ${status}`);
  }
}); 