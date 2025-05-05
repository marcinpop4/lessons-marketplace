import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
// Removed SEED_USER_PASSWORD import
// Removed unused enum imports
// Import necessary utilities and types
import { createTestStudent, createTestTeacher, loginTestUser } from '../../../utils/user.utils';
import { createTestLessonRequest } from '../../../utils/lessonRequest.utils';
import { createTestLessonQuote } from '../../../utils/lessonQuote.utils';
import { createLesson } from '../../../utils/lesson.utils';
import { Student } from '../../../../shared/models/Student';
import { Teacher } from '../../../../shared/models/Teacher';
import { LessonType } from '../../../../shared/models/LessonType';
import { UserType } from '../../../../shared/models/UserType';

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
    // Variables accessible to beforeEach and tests
    let page: Page;
    let teacher: Teacher;
    let teacherPassword: string;
    // Define lesson types here for use in setup
    const lessonType1 = LessonType.VOICE;
    const lessonType2 = LessonType.GUITAR;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage(); // Use new page for each test

        // Create a UNIQUE teacher for THIS test run
        const teacherResult = await createTestTeacher([
            { lessonType: lessonType1, rateInCents: 5000 },
            { lessonType: lessonType2, rateInCents: 4500 }
        ]);
        teacher = teacherResult.user;
        teacherPassword = teacherResult.password;
        if (!teacher || !teacher.email || !teacherPassword) {
            throw new Error('Failed to create test teacher in beforeEach');
        }

        // Login as this unique teacher
        await loginAsUser(page, teacher.email, teacherPassword, 'TEACHER');

        // Navigate to the lessons page (can be done here or at start of each test)
        await page.goto('/teacher/lessons');
        await waitForNetworkIdle(page); // Wait for base page load
    });

    test.afterEach(async () => {
        await page.close(); // Close page after each test
    });

    // --- Test 1: Accept and Void --- 
    test('Teacher handles Requested -> Accepted -> Voided flow', async () => {
        // --- Test-specific Data Setup ---
        // Create student 
        const { user: student1, password: student1Password } = await createTestStudent();
        if (!student1 || !student1.email || !student1Password) throw new Error('Test 1: Failed to create student');
        const student1Token = await loginTestUser(student1.email, student1Password, UserType.STUDENT);

        // Create request
        const request1 = await createTestLessonRequest(student1Token, student1.id, lessonType1);
        if (!request1 || !request1.id) throw new Error('Test 1: Failed to create request');

        // Create quote
        const quotes1 = await createTestLessonQuote(student1Token, { lessonRequestId: request1.id, teacherIds: [teacher.id] });
        if (!quotes1 || quotes1.length === 0 || !quotes1[0].id) throw new Error('Test 1: Failed to create quote');
        const quote1Id = quotes1[0].id;

        // Create lesson
        await createLesson(student1Token, { quoteId: quote1Id });
        // --- End Test-specific Data Setup ---

        // Reload page to see newly created data
        await page.reload();
        await waitForNetworkIdle(page);

        // --- Test Execution ---
        await expect(page.locator('h1:has-text("Lessons Dashboard")')).toBeVisible();
        const requestedSection = page.locator('#lessons-requested-section');
        const acceptedSection = page.locator('#lessons-accepted-section');
        const voidedSection = page.locator('#lessons-voided-section');

        const student1Name = `${student1.firstName} ${student1.lastName}`;
        const specificType1 = `Type:${lessonType1}`;

        // Locate lesson 1 in Requested
        const lessonCard1 = requestedSection
            .locator('.lesson-card')
            .filter({ hasText: student1Name })
            .filter({ hasText: specificType1 });
        await expect(lessonCard1, `Lesson card for ${student1Name} (${specificType1}) should be visible in Requested`).toBeVisible({ timeout: 10000 }); // Increased timeout slightly

        // Accept lesson 1
        const acceptButton = lessonCard1.getByRole('button', { name: /accept/i });
        await expect(acceptButton, 'Accept button should be visible').toBeVisible();
        await acceptButton.click();
        await waitForNetworkIdle(page);

        // Assert: Lesson moved from Requested to Accepted
        await expect(lessonCard1, `Lesson card for ${student1Name} (${specificType1}) should NOT be in Requested section`).not.toBeVisible();
        const acceptedLessonCard1 = acceptedSection
            .locator('.lesson-card')
            .filter({ hasText: student1Name })
            .filter({ hasText: specificType1 });
        await expect(acceptedLessonCard1, `Lesson card for ${student1Name} (${specificType1}) should be in Accepted section`).toBeVisible();

        // Void lesson 1
        const voidButton = acceptedLessonCard1.getByRole('button', { name: /void/i });
        await expect(voidButton, 'Void button should be visible').toBeVisible();
        await voidButton.click();
        await waitForNetworkIdle(page);

        // Assert: Lesson moved from Accepted to Voided
        await expect(acceptedLessonCard1, `Lesson card for ${student1Name} (${specificType1}) should NOT be in Accepted section`).not.toBeVisible();
        const voidedLessonCard1 = voidedSection
            .locator('.lesson-card')
            .filter({ hasText: student1Name })
            .filter({ hasText: specificType1 });
        await expect(voidedLessonCard1, `Lesson card for ${student1Name} (${specificType1}) should be in Voided section`).toBeVisible();
    });

    // --- Test 2: Reject --- 
    test('Teacher handles Requested -> Rejected flow', async () => {
        // --- Test-specific Data Setup ---
        const { user: student2, password: student2Password } = await createTestStudent();
        if (!student2 || !student2.email || !student2Password) throw new Error('Test 2: Failed to create student');
        const student2Token = await loginTestUser(student2.email, student2Password, UserType.STUDENT);

        const request2 = await createTestLessonRequest(student2Token, student2.id, lessonType2);
        if (!request2 || !request2.id) throw new Error('Test 2: Failed to create request');

        const quotes2 = await createTestLessonQuote(student2Token, { lessonRequestId: request2.id, teacherIds: [teacher.id] });
        if (!quotes2 || quotes2.length === 0 || !quotes2[0].id) throw new Error('Test 2: Failed to create quote');
        const quote2Id = quotes2[0].id;

        await createLesson(student2Token, { quoteId: quote2Id });
        // --- End Test-specific Data Setup ---

        // Reload page to see newly created data
        await page.reload();
        await waitForNetworkIdle(page);

        // --- Test Execution ---
        const requestedSection = page.locator('#lessons-requested-section');
        const rejectedSection = page.locator('#lessons-rejected-section');

        const student2Name = `${student2.firstName} ${student2.lastName}`;
        const specificType2 = `Type:${lessonType2}`;

        // Locate lesson 2 in Requested
        const lessonCard2 = requestedSection
            .locator('.lesson-card')
            .filter({ hasText: student2Name })
            .filter({ hasText: specificType2 });
        await expect(lessonCard2, `Lesson for ${student2Name} (${specificType2}) should be in Requested`).toBeVisible({ timeout: 10000 }); // Increased timeout slightly

        // Reject lesson 2
        const rejectButton = lessonCard2.getByRole('button', { name: /reject/i });
        await expect(rejectButton, 'Reject button should be visible').toBeVisible();
        await rejectButton.click();
        await waitForNetworkIdle(page);

        // Assert: Lesson moved from Requested to Rejected
        await expect(lessonCard2, `Lesson for ${student2Name} (${specificType2}) should NOT be in Requested`).not.toBeVisible();
        const rejectedLessonCard2 = rejectedSection
            .locator('.lesson-card')
            .filter({ hasText: student2Name })
            .filter({ hasText: specificType2 });
        await expect(rejectedLessonCard2, `Lesson for ${student2Name} (${specificType2}) should be in Rejected`).toBeVisible();
    });
}); 