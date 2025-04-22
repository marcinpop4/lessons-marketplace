import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
// Removed unused enum imports to avoid potential issues
// import { LessonStatusValue, LessonStatusTransition } from '../../../../shared/models/LessonStatus'; 

// Seeded teacher credentials
const SEEDED_TEACHER_EMAIL = 'emily.richardson@musicschool.com';
const SEEDED_PASSWORD = '1234';

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
        await loginAsUser(page, SEEDED_TEACHER_EMAIL, SEEDED_PASSWORD, 'TEACHER');
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

        // Sections expected based on seed data (5 lessons per status)
        const expectedSections = [
            { status: 'REQUESTED', id: 'lessons-requested-section' },
            { status: 'ACCEPTED', id: 'lessons-accepted-section' },
            { status: 'DEFINED', id: 'lessons-defined-section' },
            { status: 'COMPLETED', id: 'lessons-completed-section' },
            { status: 'REJECTED', id: 'lessons-rejected-section' },
            { status: 'VOIDED', id: 'lessons-voided-section' },
        ];

        for (const section of expectedSections) {
            await expect(
                page.locator(`#${section.id}`),
                `Lesson section for "${section.status}" should be visible`
            ).toBeVisible();
            // Check initial count (should be 5 based on seed)
            const initialCount = await getLessonCountInSection(page, `#${section.id}`);
            expect(initialCount).toBe(5);
        }

        // --- Test REQUESTED -> ACCEPTED transition --- 
        const requestedSection = page.locator('#lessons-requested-section');
        const acceptedSection = page.locator('#lessons-accepted-section');
        const firstRequestedCard = requestedSection.locator('.card').first();
        const initialAcceptedCount = await getLessonCountInSection(page, '#lessons-accepted-section');

        // Find and click the Accept button
        const acceptButton = firstRequestedCard.getByRole('button', { name: /accept/i });
        await expect(acceptButton).toBeVisible();
        await acceptButton.click();
        await waitForNetworkIdle(page); // Wait for UI update

        // Assert: Lesson moved from REQUESTED to ACCEPTED
        await expect(requestedSection.locator('.card').first()).not.toBe(firstRequestedCard); // Card should be gone
        const finalAcceptedCount = await getLessonCountInSection(page, '#lessons-accepted-section');
        expect(finalAcceptedCount).toBe(initialAcceptedCount + 1);

        // --- Test DEFINED -> COMPLETED transition --- 
        const definedSection = page.locator('#lessons-defined-section');
        const completedSection = page.locator('#lessons-completed-section');
        const firstDefinedCard = definedSection.locator('.card').first();
        const initialCompletedCount = await getLessonCountInSection(page, '#lessons-completed-section');

        // Find and click the Complete button on the DEFINED card
        const completeButtonDefined = firstDefinedCard.getByRole('button', { name: /complete/i });
        await expect(completeButtonDefined, 'Complete button should be visible on DEFINED card').toBeVisible();
        await completeButtonDefined.click();
        await waitForNetworkIdle(page); // Wait for UI update

        // Assert: Lesson moved from DEFINED to COMPLETED
        await expect(definedSection.locator('.card').first()).not.toBe(firstDefinedCard); // Card should be gone from DEFINED
        const finalCompletedCountDefined = await getLessonCountInSection(page, '#lessons-completed-section');
        expect(finalCompletedCountDefined, 'Completed count should increase by 1').toBe(initialCompletedCount + 1);

        // TODO: Add tests for other transitions like REJECT, VOID, DEFINE (navigation)
    });
}); 