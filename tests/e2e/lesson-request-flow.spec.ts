import { test, expect } from '@playwright/test';

/**
 * End-to-end test for the complete lesson request flow.
 * Covers the entire user journey from login to confirmation.
 */

// Use test.describe.serial to ensure tests run one after another
test.describe.serial('Lesson request flow', () => {
  test('Complete end-to-end lesson booking flow', async ({ page }) => {
    // 1. Login as an existing student
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    
    // Fill in the login form with an existing student from seed data
    await page.getByLabel('Email').fill('ethan.parker@example.com');
    await page.getByLabel('Password').fill('1234');
    await page.locator('input[value="STUDENT"]').check();
    
    // Submit login form and wait for navigation
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
      ),
      page.locator('form button[type="submit"]').click()
    ]);
    
    // Wait for navigation to lesson request page
    await expect(page).toHaveURL(/.*\/lesson-request.*/);
    
    // 2. Fill out the lesson request form
    await expect(page.locator('form')).toBeVisible();
    
    // Fill in the minimum required fields
    await page.getByLabel('Lesson Type').selectOption('GUITAR');
    await page.getByLabel('Duration').selectOption('30');
    await page.getByLabel('Date').fill(new Date().toISOString().split('T')[0]);
    await page.getByLabel('Time').selectOption('10:00');
    await page.getByLabel('Street').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State').fill('TS');
    await page.getByLabel('Postal Code').fill('12345');
    
    // Create a promise that resolves when we see the complete sequence of quote creation
    const waitForQuotesCreation = new Promise<void>((resolve) => {
      let postCount = 0;
      let sawFinalGet = false;
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/v1/lesson-quotes')) {
          if (response.request().method() === 'POST' && response.status() === 201) {
            postCount++;
          } else if (response.request().method() === 'GET' && postCount > 0) {
            sawFinalGet = true;
            // Only resolve after we've seen some successful POSTs and a subsequent GET
            resolve();
          }
        }
      });
    });
    
    // Submit the form and wait for initial navigation
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/v1/lesson-requests') && response.request().method() === 'POST'
      ),
      page.locator('form button[type="submit"]').click()
    ]);
    
    // Wait for navigation and initial data load
    await expect(page).toHaveURL(/.*\/teacher-quotes\/.*/);
    
    // Extract request ID from URL to use in response waiting
    const requestId = page.url().split('/').pop();
    
    // Wait for lesson request details to load
    await page.waitForResponse(
      response => response.url().includes(`/api/v1/lesson-requests/${requestId}`)
    );
    
    // Verify lesson request card is rendered
    await expect(page.locator('.lesson-request-details')).toBeVisible();
    
    // Wait for quotes to be created and then fetched
    await waitForQuotesCreation;
    
    // Now wait for the quotes container and verify quotes are present
    await expect(page.locator('.teacher-quotes-container')).toBeVisible();
    
    // Wait for the first quote to be visible
    await expect(page.locator('.teacher-quote').first()).toBeVisible();
    
    // Get the quote count after we know they're visible
    const quoteCount = await page.locator('.teacher-quote').count();
    expect(quoteCount).toBeGreaterThan(0);
    
    // Verify hourly rates are present (should be equal to quote count)
    const ratesCount = await page.locator('.hourly-rate').count();
    expect(ratesCount).toBe(quoteCount);
  });
}); 