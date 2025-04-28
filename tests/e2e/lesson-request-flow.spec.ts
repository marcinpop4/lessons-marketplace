import { test, expect } from '@playwright/test';
import { SEED_USER_PASSWORD } from 'tests/e2e/constants';

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
    await page.getByLabel('Password').fill(SEED_USER_PASSWORD);
    await page.locator('input[value="STUDENT"]').check();

    // Submit login form and wait for navigation
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
      ),
      page.locator('form button[type="submit"]').click()
    ]);

    // Wait for navigation to lesson request page
    await expect(page).toHaveURL(/.*\/lesson-request.*/, { timeout: 5000 });

    // --- NEW: Wait for key form elements to be visible ---
    await expect(page.getByRole('heading', { name: 'Request a Lesson' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Request' })).toBeVisible();
    // Also ensure the form container itself is visible before proceeding
    await expect(page.locator('form')).toBeVisible();
    // --- END NEW ---

    // 2. Fill out the lesson request form
    await expect(page.locator('form')).toBeVisible();

    // Fill in the minimum required fields
    await page.getByLabel('Lesson Type').selectOption('GUITAR');
    await page.getByLabel('Duration').selectOption('30');
    const today = new Date().toISOString().split('T')[0];
    if (!today) throw new Error('Failed to get today\'s date');
    await page.getByLabel('Date').fill(today);
    await page.getByLabel('Time').selectOption('10:00');
    await page.getByLabel('Street').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State').fill('TS');
    await page.getByLabel('Postal Code').fill('12345');

    // Submit the form and wait for the lesson request creation response
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/v1/lesson-requests') && response.request().method() === 'POST'
      ),
      page.locator('form button[type="submit"]').click()
    ]);

    // Wait for navigation to teacher quotes page
    await expect(page).toHaveURL(/.*\/teacher-quotes\/.*/);

    // Extract request ID from URL to use in response waiting
    const urlParts = page.url().split('/');
    const requestId = urlParts[urlParts.length - 1];

    // Wait for lesson request details to load
    await page.waitForResponse(
      response => response.url().includes(`/api/v1/lesson-requests/${requestId}`)
    );

    // Verify lesson request card is rendered
    await expect(page.locator('.lesson-request-details')).toBeVisible();

    // Now wait for the quotes container and verify quotes are present
    await expect(page.locator('.teacher-quotes-container')).toBeVisible();

    // Wait for the first quote to be visible
    await expect(page.locator('.card.card-accent.teacher-quote-card').first()).toBeVisible();

    // Get the quote count after we know they're visible
    const quoteCount = await page.locator('.card.card-accent.teacher-quote-card').count();
    expect(quoteCount).toBeGreaterThan(0);

    // Click accept on the first quote
    const acceptButton = page.locator('.card.card-accent.teacher-quote-card').first().locator('.btn.btn-accent');
    await acceptButton.click();

    // Wait for navigation to lesson confirmation page
    await expect(page).toHaveURL(/.*\/lesson-confirmation\/.*/);

    // Wait for lesson details to be visible
    await expect(page.locator('.lesson-details')).toBeVisible();

    // Verify lesson details are displayed
    await expect(page.locator('.lesson-details-grid .lesson-detail-teacher')).toBeVisible();
    await expect(page.locator('.lesson-details-grid .lesson-detail-cost')).toBeVisible();
    await expect(page.locator('.lesson-details-grid .lesson-detail-datetime')).toBeVisible();
    await expect(page.locator('.lesson-details-grid .lesson-detail-duration')).toBeVisible();
    await expect(page.locator('.lesson-details-grid .lesson-detail-location')).toBeVisible();

    // Optional: Further checks like verifying specific text content
  });
}); 