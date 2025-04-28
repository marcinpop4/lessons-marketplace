import { test, expect } from '@playwright/test';
import { SEED_USER_PASSWORD } from '../constants';

/**
 * Simple authentication tests
 * These tests fill the login form, submit it, and verify successful login
 */

test('Student login form submission', async ({ page }) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Go to the login page and wait for network idle
      await page.goto('/login', { waitUntil: 'networkidle' });

      // Get form elements
      const form = page.locator('form');
      const emailInput = page.getByLabel('Email');
      const passwordInput = page.getByLabel('Password');
      const studentRadio = page.locator('input[value="STUDENT"]');
      const submitButton = form.getByRole('button', { name: /login/i });

      // Wait for form to be ready and interactive
      await Promise.all([
        expect(form).toBeVisible(),
        expect(emailInput).toBeVisible(),
        expect(passwordInput).toBeVisible(),
        expect(studentRadio).toBeVisible(),
        expect(submitButton).toBeVisible(),
        expect(submitButton).toBeEnabled()
      ]);

      // Clear any existing values and fill the form
      await emailInput.clear();
      await passwordInput.clear();
      await emailInput.fill('ethan.parker@example.com');
      await passwordInput.fill(SEED_USER_PASSWORD);
      await studentRadio.check();

      // Set up response and navigation promises before clicking
      const [response] = await Promise.all([
        page.waitForResponse(
          response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
        ),
        submitButton.click()
      ]);

      const status = response.status();

      if (status === 200) {
        await expect(page).toHaveURL(/.*\/lesson-request.*/, { timeout: 5000 });
        return; // Success! Exit the retry loop
      }

      if (status !== 500) {
        // If it's not a 500 error, it's a different problem - fail immediately
        const errorMessage = page.locator('.alert-error');
        await expect(errorMessage).toBeVisible();
        throw new Error(`Login failed with status ${status}`);
      }

      // If we get here, it was a 500 error
      attempts++;
      if (attempts < maxAttempts) {
        // Wait a bit before retrying
        await page.waitForTimeout(1000);
        continue;
      }

      throw new Error(`Login failed with status 500 after ${maxAttempts} attempts`);
    } catch (error) {
      if (attempts >= maxAttempts - 1) throw error;
      attempts++;
      await page.waitForTimeout(1000);
    }
  }
});

test('Teacher login form submission', async ({ page }) => {
  // Go to the login page and wait for network idle
  await page.goto('/login', { waitUntil: 'networkidle' });

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
    expect(submitButton).toBeVisible(),
    expect(submitButton).toBeEnabled() // Ensure button is enabled
  ]);

  // Fill the login form
  await emailInput.clear(); // Clear potential pre-filled values
  await passwordInput.clear();
  await emailInput.fill('emily.richardson@musicschool.com');
  await passwordInput.fill(SEED_USER_PASSWORD);
  await teacherRadio.check();

  // Set up response and navigation promises before clicking
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
  );
  // Use waitForURL for navigation confirmation
  const navigationPromise = page.waitForURL(/.*\/teacher\/lessons.*/, { timeout: 4000 });

  // Submit form
  await submitButton.click();

  // Wait for API response
  const response = await responsePromise;
  const status = response.status();

  // If login successful, wait for navigation to complete and page to be stable
  if (status === 200) {
    await navigationPromise; // Wait for the URL to match
    await page.waitForLoadState('networkidle'); // Wait for network stability after navigation
    // Optional: Wait for a specific element on the dashboard to confirm load
    await expect(page.locator('h1:has-text("Lessons Dashboard")'), 'Lessons Dashboard title should be visible').toBeVisible({ timeout: 3000 });
  } else {
    // If login failed, wait for and verify error message
    const errorMessage = page.locator('.alert-error');
    await expect(errorMessage, `Login failed with status ${status}, expected error message`).toBeVisible();
    throw new Error(`Login failed with status ${status}`);
  }
}); 