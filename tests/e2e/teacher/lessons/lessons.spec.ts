import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
// Remove enum import that's causing issues
// import { LessonStatusValue } from '@shared/models/LessonStatus.js';

// Define status values directly to avoid import issues
const STATUS = {
    REQUESTED: 'requested',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    COMPLETED: 'completed',
    VOIDED: 'voided'
};

// Use credentials matching a user created in server/prisma/seed.js
const SEEDED_TEACHER_EMAIL = 'emily.richardson@musicschool.com';
const SEEDED_PASSWORD = '1234'; // Password used in seed.js

// Helper function to login as teacher
async function loginAsTeacher(page: Page) {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();

    await page.getByLabel('Email').fill(SEEDED_TEACHER_EMAIL);
    await page.getByLabel('Password').fill(SEEDED_PASSWORD);
    await page.locator('input[value="TEACHER"]').check();

    await Promise.all([
        page.waitForResponse(
            (response: Response) =>
                response.url().includes('/api/v1/auth/login') &&
                response.request().method() === 'POST' &&
                response.status() === 200, // Wait for successful login
        ),
        page.locator('form button[type="submit"]').click(),
    ]);

    // Wait for navigation to the lessons page
    await expect(page).toHaveURL(/.*\/teacher\/lessons.*/);
}

// Helper function to wait for network requests to complete
async function waitForNetworkIdle(page: Page) {
    await page.waitForLoadState('networkidle');
    // Additional delay to ensure UI has updated
    await page.waitForTimeout(500);
}

test.describe('Teacher Lesson Management', () => {
    test('Teacher can view lessons and manage their statuses', async ({ page }) => {
        // 1. Login as Teacher
        await loginAsTeacher(page);

        // 2. Wait for page to fully load
        await waitForNetworkIdle(page);

        // Define locator for success banner
        const successBanner = page.locator('#success-message-banner');

        // 3. Verify that sections for all statuses are visible
        for (const status of Object.values(STATUS)) {
            await expect(
                page.locator(`#lessons-${status}-section`),
                `Lesson section for "${status}" should be visible`
            ).toBeVisible();
        }

        // 4. Test REQUESTED -> ACCEPTED transition
        // Find a lesson card in the REQUESTED section
        const requestedCard = page.locator('#lessons-requested-section .card').first();
        await expect(requestedCard).toBeVisible();

        // Find and click the Accept button
        const acceptButton = requestedCard.getByRole('button', { name: /accept/i });
        await expect(acceptButton).toBeVisible();
        await acceptButton.click();
        await waitForNetworkIdle(page);

        // Assert success message appears for ACCEPTED
        await expect(successBanner).toBeVisible();
        await expect(successBanner).toContainText(/Successfully updated status.*to accepted/i);

        // 5. Test ACCEPTED -> COMPLETED transition
        // Find a lesson card in the ACCEPTED section
        const acceptedCard = page.locator('#lessons-accepted-section .card').first();
        await expect(acceptedCard).toBeVisible();

        // Find and click the Complete button
        const completeButton = acceptedCard.getByRole('button', { name: /complete/i });
        await expect(completeButton).toBeVisible();
        await completeButton.click();
        await waitForNetworkIdle(page);

        // Assert success message appears for COMPLETED
        await expect(successBanner).toBeVisible();
        await expect(successBanner).toContainText(/Successfully updated status.*to completed/i);

        // 6. Test ACCEPTED -> VOIDED transition
        // There should be another ACCEPTED card (since we created multiple in seed.js)
        const anotherAcceptedCard = page.locator('#lessons-accepted-section .card').first();
        await expect(anotherAcceptedCard).toBeVisible();

        // Find and click the Void button
        const voidButton = anotherAcceptedCard.getByRole('button', { name: /void/i });
        await expect(voidButton).toBeVisible();
        await voidButton.click();
        await waitForNetworkIdle(page);

        // Assert success message appears for VOIDED
        await expect(successBanner).toBeVisible();
        await expect(successBanner).toContainText(/Successfully updated status.*to voided/i);

        // 7. Verify all status sections are still visible after transitions
        for (const status of Object.values(STATUS)) {
            await expect(
                page.locator(`#lessons-${status}-section`),
                `Lesson section for "${status}" should still be visible after transitions`
            ).toBeVisible();
        }
    });
}); 