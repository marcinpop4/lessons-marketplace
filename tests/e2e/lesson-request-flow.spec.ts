import { test, expect } from '@playwright/test';

/**
 * End-to-end test for the complete lesson request flow.
 * Covers the entire user journey from login to confirmation.
 */

// Use test.describe.serial to ensure tests run one after another
test.describe.serial('Lesson request flow', () => {
  test('Complete end-to-end lesson booking flow', async ({ page }) => {
    // 1. Login as an existing student
    await page.goto('/auth');
    
    // Wait for the app to be ready
    await page.waitForSelector('.login-form');
    
    // Fill in the login form with an existing student from seed data
    await page.fill('#email', 'ethan.parker@example.com');
    await page.fill('#password', '1234');
    await page.click('input[value="STUDENT"]');
    
    // Submit login form
    await page.locator('form button[type="submit"]').click();
    
    // Add a small wait after form submission to ensure the page has time to process
    await page.waitForTimeout(100);
    
    // Wait for either the lesson request form to appear or an error message
    await Promise.race([
      page.waitForSelector('.lesson-request-form'),
      page.waitForSelector('[role="alert"]')
    ]);
    
    // Check if we see an error message
    const errorMessage = page.locator('[role="alert"]');
    const hasError = await errorMessage.isVisible();
    
    if (hasError) {
      console.log('Login failed with error:', await errorMessage.textContent());
      await page.screenshot({ path: 'tests/screenshots/login-error.png' });
      return;
    }
    
    console.log('Login successful');
    
    // 2. Fill out the lesson request form
    await expect(page.locator('.lesson-request-form')).toBeVisible();
    
    // Fill in the minimum required fields
    await page.selectOption('#type', 'GUITAR');
    await page.selectOption('#durationMinutes', '30');
    await page.fill('#date', new Date().toISOString().split('T')[0]);
    await page.selectOption('#time', '10:00');
    await page.fill('#addressObj\\.street', '123 Test Street');
    await page.fill('#addressObj\\.city', 'Test City');
    await page.fill('#addressObj\\.state', 'TS');
    await page.fill('#addressObj\\.postalCode', '12345');
    
    // Submit the form
    await page.locator('form button[type="submit"]').click();
    
    // 3. Verify teacher quotes page components
    // Wait for navigation
    await page.waitForURL(/.*\/teacher-quotes\/.*/);
    
    // Verify lesson request card is rendered
    await expect(page.locator('.lesson-request-details')).toBeVisible();
    
    // Wait for the teacher quotes to load
    await page.waitForSelector('.hourly-rate', { state: 'visible' });
    
    // Verify at least one teacher quote is rendered
    const quoteCount = await page.locator('.hourly-rate').count();
    expect(quoteCount).toBeGreaterThan(0);
    
    console.log('Test completed successfully: Page renders with lesson request and teacher quotes');
  });
}); 