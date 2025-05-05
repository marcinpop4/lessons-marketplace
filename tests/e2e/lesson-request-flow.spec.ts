import { test, expect } from '@playwright/test';
// Removed SEED_USER_PASSWORD import
// Import necessary utilities and types
import { createTestStudent, createTestTeacher, loginTestUser } from '../utils/user.utils';
import { LessonType } from '../../shared/models/LessonType';
import { UserType } from '../../shared/models/UserType';
import { Teacher } from '../../shared/models/Teacher';
import { Student } from '../../shared/models/Student';

/**
 * End-to-end test for the complete lesson request flow.
 * Covers the entire user journey from login to confirmation.
 */

// Use test.describe.serial to ensure tests run one after another
test.describe('Lesson request flow', () => {
  test('Complete end-to-end lesson booking flow', async ({ page }) => {

    // --- Test Setup ---
    // Create a teacher who can teach GUITAR
    const { user: teacher } = await createTestTeacher([
      { lessonType: LessonType.GUITAR, rateInCents: 4500 }
    ]);
    if (!teacher) throw new Error('Failed to create test teacher');

    // Create a student
    const { user: student, password: studentPassword } = await createTestStudent();
    if (!student || !student.email || !studentPassword) {
      throw new Error('Failed to create test student');
    }
    // --- End Test Setup ---

    // 1. Login as the created student
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();

    // Fill in the login form with dynamically created student credentials
    await page.getByLabel('Email').fill(student.email);
    await page.getByLabel('Password').fill(studentPassword);
    await page.locator('input[value="STUDENT"]').check();

    // Submit login form and wait for navigation
    await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST'
      ),
      page.locator('form button[type="submit"]').click()
    ]);

    // Wait for navigation to lesson request page
    await expect(page).toHaveURL(/.*\/lesson-request.*/, { timeout: 10000 }); // Increased timeout slightly

    // --- Wait for key form elements to be visible ---
    await expect(page.getByRole('heading', { name: 'Request a Lesson' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Request' })).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
    // --- END Wait ---

    // 2. Fill out the lesson request form (Requesting GUITAR)
    await expect(page.locator('form')).toBeVisible();

    await page.getByLabel('Lesson Type').selectOption(LessonType.GUITAR); // Use enum
    await page.getByLabel('Duration').selectOption('30');
    const today = new Date().toISOString().split('T')[0];
    if (!today) throw new Error('Failed to get today\'s date');
    await page.getByLabel('Date').fill(today);
    await page.getByLabel('Time').selectOption('10:00');
    await page.getByLabel('Street').fill('123 Test Flow St');
    await page.getByLabel('City').fill('Flow City');
    await page.getByLabel('State').fill('FL');
    await page.getByLabel('Postal Code').fill('98765');

    // Submit the form and wait for the lesson request creation response
    let createdRequestId: string | null = null;
    await Promise.all([
      page.waitForResponse(
        async response => {
          if (response.url().includes('/api/v1/lesson-requests') && response.request().method() === 'POST') {
            try {
              const body = await response.json();
              createdRequestId = body?.id; // Capture the ID from the response
            } catch (e) { /* ignore json parsing errors */ }
            return true;
          }
          return false;
        }
      ),
      page.locator('form button[type="submit"]').click()
    ]);

    // Assert that we got a request ID
    expect(createdRequestId, 'Should have captured a lesson request ID from the POST response').toBeTruthy();

    // Wait for navigation to teacher quotes page using the captured ID
    await expect(page).toHaveURL(new RegExp(`.*\/teacher-quotes\/${createdRequestId}.*`));

    // Wait for lesson request details to load (using captured ID)
    await page.waitForResponse(
      response => response.url().includes(`/api/v1/lesson-requests/${createdRequestId}`)
    );

    // Verify lesson request card is rendered
    await expect(page.locator('.lesson-request-details')).toBeVisible();

    // Now wait for the quotes container and verify quotes are present
    await expect(page.locator('.teacher-quotes-container')).toBeVisible();

    // Wait for the first quote (should be from our created teacher) to be visible
    await expect(page.locator('.card.card-accent.teacher-quote-card').first()).toBeVisible({ timeout: 15000 }); // Increased timeout

    // Get the quote count 
    const quoteCount = await page.locator('.card.card-accent.teacher-quote-card').count();
    expect(quoteCount).toBeGreaterThan(0); // Expect at least one quote (from our teacher)

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

  });
}); 