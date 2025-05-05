import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
// Removed SEEDED_TEACHER_EMAIL
// Import necessary utilities and types
import { createTestStudent, createTestTeacher, loginTestUser } from '../utils/user.utils';
import { createTestLessonRequest } from '../utils/lessonRequest.utils';
import { createTestLessonQuote } from '../utils/lessonQuote.utils';
import { createLesson } from '../utils/lesson.utils';
import { Student } from '../../shared/models/Student';
import { Teacher } from '../../shared/models/Teacher';
import { Lesson } from '../../shared/models/Lesson';
import { LessonType } from '../../shared/models/LessonType';
import { UserType } from '../../shared/models/UserType';

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
                response.status() === 200,
        ),
        page.locator('form button[type="submit"]').click(),
    ]);

    const expectedUrlPart = userType === 'TEACHER' ? '/teacher/lessons' : '/student/dashboard';
    await expect(page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
}

// Helper function to wait for network requests to complete
async function waitForNetworkIdle(page: Page) {
    await page.waitForLoadState('networkidle');
    // Additional delay to ensure UI has updated
    await page.waitForTimeout(500);
}

test.describe('Teacher Goal Management', () => {
    let page: Page;
    let teacher: Teacher;
    let teacherPassword: string;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();

        // Create a UNIQUE teacher for THIS test run
        // Ensure the teacher offers types used in tests (e.g., VOICE, GUITAR)
        const teacherResult = await createTestTeacher([
            { lessonType: LessonType.VOICE, rateInCents: 5000 },
            { lessonType: LessonType.GUITAR, rateInCents: 4500 }
        ]);
        teacher = teacherResult.user;
        teacherPassword = teacherResult.password;
        if (!teacher || !teacher.email || !teacherPassword) {
            throw new Error('Failed to create test teacher in beforeEach');
        }

        // Login as this unique teacher
        await loginAsUser(page, teacher.email, teacherPassword, 'TEACHER');
        // DO NOT navigate here, tests will navigate to specific lesson page
    });

    test.afterEach(async () => {
        await page.close();
    });

    test('Teacher can manage goals through their lifecycle', async () => {
        // --- Test-specific Data Setup ---
        const lessonType = LessonType.VOICE; // Use a specific type
        const { user: student, password: studentPassword } = await createTestStudent();
        if (!student || !student.email || !studentPassword) throw new Error('Test 1: Failed to create student');
        const studentToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);
        const request = await createTestLessonRequest(studentToken, student.id, lessonType);
        if (!request || !request.id) throw new Error('Test 1: Failed to create request');
        const quotes = await createTestLessonQuote(studentToken, { lessonRequestId: request.id, teacherIds: [teacher.id] });
        if (!quotes || quotes.length === 0 || !quotes[0].id) throw new Error('Test 1: Failed to create quote');
        const quoteId = quotes[0].id;
        const lessonResponse = await createLesson(studentToken, { quoteId: quoteId }); // Capture response
        const lesson: Lesson = lessonResponse.data;
        if (!lesson || !lesson.id) throw new Error('Test 1: Failed to create lesson');
        // --- End Test-specific Data Setup ---

        // Navigate directly to the lesson's goal page
        await page.goto(`/teacher/lessons/${lesson.id}`);
        await waitForNetworkIdle(page);

        // --- Test Execution ---
        await expect(page.locator('.add-goal-card')).toBeVisible();
        const addGoalForm = page.locator('.add-goal-card');

        const goalTitle = 'Test Goal Lifecycle';
        await addGoalForm.getByLabel('Goal Title').fill(goalTitle);
        await addGoalForm.getByLabel('Goal Description').fill('Lifecycle description');
        await addGoalForm.getByLabel('Lessons to Achieve').fill('3');
        await addGoalForm.locator('#add-goal-button').click();
        await waitForNetworkIdle(page);

        // Verify goal appears in Ready to Start section
        const readySection = page.locator('section.goal-status-section:has(h3:has-text("Ready to Start"))');
        const newGoalCard = readySection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) }); // Template literal for title
        await expect(newGoalCard, 'New goal should appear in Ready to Start section').toBeVisible();

        // Start the goal
        const startButton = newGoalCard.getByRole('button', { name: /start/i });
        await expect(startButton, 'Start button should be visible').toBeVisible();
        await startButton.click();
        await waitForNetworkIdle(page);

        // Verify goal moved to In Progress section
        const inProgressSection = page.locator('section.goal-status-section:has(h3:has-text("In Progress"))');
        const inProgressGoalCard = inProgressSection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) });
        await expect(inProgressGoalCard, 'Goal should appear in In Progress section').toBeVisible();
        await expect(readySection, 'Ready to Start section should be empty or not contain the goal').not.toContainText(goalTitle);

        // Complete the goal
        const completeButton = inProgressGoalCard.getByRole('button', { name: /complete/i });
        await expect(completeButton, 'Complete button should be visible').toBeVisible();
        await completeButton.click();

        const completionModal = page.locator('[data-testid="goal-completion-modal"]');
        await expect(completionModal, 'Completion modal should appear').toBeVisible();
        await completionModal.locator('textarea[placeholder*="Student successfully"]').fill('Goal completed successfully');
        await completionModal.getByRole('button', { name: 'Confirm Completion' }).click();
        await waitForNetworkIdle(page);

        // Verify goal moved to Achieved section
        const achievedSection = page.locator('section.goal-status-section:has(h3:has-text("Achieved"))');
        const completedGoalCard = achievedSection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) });
        await expect(completedGoalCard, 'Goal should appear in Achieved section').toBeVisible();
        await expect(inProgressSection, 'In Progress section should be empty or not contain the goal').not.toContainText(goalTitle);
    });

    test('Teacher can complete a goal and define the lesson', async () => {
        // --- Test-specific Data Setup ---
        const lessonType = LessonType.GUITAR; // Use a different type
        const { user: student, password: studentPassword } = await createTestStudent();
        if (!student || !student.email || !studentPassword) throw new Error('Test 2: Failed to create student');
        const studentToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);
        const request = await createTestLessonRequest(studentToken, student.id, lessonType);
        if (!request || !request.id) throw new Error('Test 2: Failed to create request');
        const quotes = await createTestLessonQuote(studentToken, { lessonRequestId: request.id, teacherIds: [teacher.id] });
        if (!quotes || quotes.length === 0 || !quotes[0].id) throw new Error('Test 2: Failed to create quote');
        const quoteId = quotes[0].id;
        const lessonResponse = await createLesson(studentToken, { quoteId: quoteId }); // Capture response
        const lesson: Lesson = lessonResponse.data;
        if (!lesson || !lesson.id) throw new Error('Test 2: Failed to create lesson');
        // --- End Test-specific Data Setup ---

        // Navigate directly to the lesson's goal page
        await page.goto(`/teacher/lessons/${lesson.id}`);
        await waitForNetworkIdle(page);

        // --- Test Execution ---
        await expect(page.locator('.add-goal-card')).toBeVisible();
        const addGoalForm = page.locator('.add-goal-card');

        const goalTitle = "Goal to Define Lesson";
        await addGoalForm.getByLabel('Goal Title').fill(goalTitle);
        await addGoalForm.getByLabel('Goal Description').fill('Complete this to define the lesson');
        await addGoalForm.getByLabel('Lessons to Achieve').fill('1');
        await addGoalForm.locator('#add-goal-button').click();
        await waitForNetworkIdle(page);

        // Start and complete the goal
        const readySection = page.locator('section.goal-status-section:has(h3:has-text("Ready to Start"))');
        const goalToComplete = readySection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) });
        await expect(goalToComplete, `Goal '${goalTitle}' should be in Ready section`).toBeVisible();

        await goalToComplete.getByRole('button', { name: /start/i }).click();
        await waitForNetworkIdle(page);

        const inProgressSection = page.locator('section.goal-status-section:has(h3:has-text("In Progress"))');
        const inProgressGoalToComplete = inProgressSection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) });
        await expect(inProgressGoalToComplete, `Goal '${goalTitle}' should be in Progress section`).toBeVisible();

        await inProgressGoalToComplete.getByRole('button', { name: /complete/i }).click();

        const completionModal = page.locator('[data-testid="goal-completion-modal"]');
        await expect(completionModal, 'Completion modal should appear').toBeVisible();
        await completionModal.locator('textarea[placeholder*="Student successfully"]').fill('Goal completed, ready for lesson definition');
        await completionModal.getByRole('button', { name: 'Confirm Completion' }).click();
        await waitForNetworkIdle(page);

        // Check if goal is in Achieved section
        const achievedSection = page.locator('section.goal-status-section:has(h3:has-text("Achieved"))');
        const achievedGoal = achievedSection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) });
        await expect(achievedGoal, `Goal '${goalTitle}' should be in Achieved section`).toBeVisible();
    });
}); 