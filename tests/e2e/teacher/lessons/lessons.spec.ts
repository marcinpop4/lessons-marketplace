import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
import { SEED_USER_PASSWORD } from '../../constants'; // Import from new constants file
// Removed unused enum imports to avoid potential issues
// import { LessonStatusValue, LessonStatusTransition } from '../../../../shared/models/LessonStatus'; 

// Seeded teacher credentials
const SEEDED_TEACHER_EMAIL = 'emily.richardson@musicschool.com';

// --- Re-added Helper Functions ---
// Helper function to login as a user
async function loginAsUser(page: Page, email: string, password: string, userType: 'STUDENT' | 'TEACHER') {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator(`input[value="${userType}"]`).check();

    await Promise.all([
        page.waitForResponse(
            (response: Response) =>
                response.url().includes('/api/v1/auth/login') &&
                response.request().method() === 'POST' &&
                response.status() === 200, // Wait for successful login
        ),
        page.locator('form button[type="submit"]').click(),
    ]);

    // Wait for navigation based on role
    const expectedUrlPart = userType === 'TEACHER' ? '/teacher/lessons' : '/student/dashboard'; // Example student dashboard path
    await expect(page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
}

// Helper function to wait for network requests to complete
async function waitForNetworkIdle(page: Page) {
    await page.waitForLoadState('networkidle');
    // Additional delay to ensure UI has updated
    await page.waitForTimeout(500);
}
// --- End Re-added Helper Functions ---

// Function to get the count of lesson cards in a specific section
const getLessonCountInSection = async (page: Page, sectionId: string): Promise<number> => {
    return page.locator(`${sectionId} .card`).count();
};

test.describe('Teacher Lesson Management', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        // Login as the seeded teacher before running the tests
        await loginAsUser(page, SEEDED_TEACHER_EMAIL, SEED_USER_PASSWORD, 'TEACHER');
        // Navigate to the teacher's lessons page
        await page.goto('/teacher/lessons');
        await waitForNetworkIdle(page); // Wait for initial data load
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Teacher can view lessons and manage their statuses', async () => {
        // 1. Verify initial page load and presence of different status sections
        await expect(page.locator('h1:has-text("Lessons Dashboard")')).toBeVisible();

        const requestedSection = page.locator('#lessons-requested-section');
        const acceptedSection = page.locator('#lessons-accepted-section');
        const rejectedSection = page.locator('#lessons-rejected-section');
        const voidedSection = page.locator('#lessons-voided-section');

        // --- Test REQUESTED -> ACCEPTED transition --- 
        const student1Name = 'Ethan Parker';
        const specificType = 'Type:Voice'; // Removed space to match rendered HTML

        // Locate the card containing both pieces of text using chained filters with hasText
        const lessonCard1 = requestedSection
            .locator('.lesson-card')
            .filter({ hasText: student1Name })
            .filter({ hasText: specificType });

        // Assert the card itself is visible
        await expect(lessonCard1, `Lesson card for ${student1Name} (${specificType}) should be visible`).toBeVisible();

        const acceptButton = lessonCard1.getByRole('button', { name: /accept/i });
        await expect(acceptButton, 'Accept button should be visible').toBeVisible();
        await acceptButton.click();
        await waitForNetworkIdle(page); // Wait for UI update

        // Assert: Lesson moved from REQUESTED to ACCEPTED
        await expect(lessonCard1, `Lesson card for ${student1Name} (${specificType}) should NOT be in Requested section`).not.toBeVisible();
        // Update the locator for the accepted card similarly
        const acceptedLessonCard1 = acceptedSection
            .locator('.lesson-card')
            .filter({ hasText: student1Name })
            .filter({ hasText: specificType });
        await expect(acceptedLessonCard1, `Lesson card for ${student1Name} (${specificType}) should be in Accepted section`).toBeVisible();

        // --- Test ACCEPTED -> VOIDED transition --- 
        const voidButton = acceptedLessonCard1.getByRole('button', { name: /void/i });
        await expect(voidButton, 'Void button should be visible').toBeVisible();
        await voidButton.click();
        await waitForNetworkIdle(page); // Wait for UI update

        // Assert: Lesson moved from ACCEPTED to VOIDED
        await expect(acceptedLessonCard1, `Lesson card for ${student1Name} (${specificType}) should NOT be in Accepted section`).not.toBeVisible();
        // Update the locator for the voided card similarly
        const voidedLessonCard1 = voidedSection
            .locator('.lesson-card')
            .filter({ hasText: student1Name })
            .filter({ hasText: specificType });
        await expect(voidedLessonCard1, `Lesson card for ${student1Name} (${specificType}) should be in Voided section`).toBeVisible();

        // --- Test REQUESTED -> REJECTED transition --- 
        const student2Name = 'Ava Johnson'; // ADJUST IF NEEDED based on seed data/UI
        // Keep simple filter for Ava as it was likely unique
        const lessonCard2 = requestedSection
            .locator('.lesson-card')
            .filter({ hasText: `Lesson with ${student2Name}` }); // More specific text match
        await expect(lessonCard2, `Lesson for ${student2Name} should be in Requested`).toBeVisible();

        const rejectButton = lessonCard2.getByRole('button', { name: /reject/i });
        await expect(rejectButton, 'Reject button should be visible').toBeVisible();
        await rejectButton.click();
        await waitForNetworkIdle(page); // Wait for UI update

        // Assert: Lesson moved from REQUESTED to REJECTED
        await expect(lessonCard2, `Lesson for ${student2Name} should NOT be in Requested`).not.toBeVisible();
        const rejectedLessonCard2 = rejectedSection
            .locator('.lesson-card')
            .filter({ hasText: `Lesson with ${student2Name}` }); // More specific text match
        await expect(rejectedLessonCard2, `Lesson for ${student2Name} should be in Rejected`).toBeVisible();

        // Removed DEFINED -> COMPLETED test as per request
    });
}); 