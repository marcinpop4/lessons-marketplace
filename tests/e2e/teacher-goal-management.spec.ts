import { test, expect } from '@playwright/test';
import type { Page, Response } from '@playwright/test';
import { SEED_USER_PASSWORD } from './constants'; // Corrected import path

// Seeded teacher credentials
const SEEDED_TEACHER_EMAIL = 'emily.richardson@musicschool.com';

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

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        // Login as the seeded teacher before running the tests
        await loginAsUser(page, SEEDED_TEACHER_EMAIL, SEED_USER_PASSWORD, 'TEACHER');
        // Navigate to the teacher's lessons page
        await page.goto('/teacher/lessons');
        await waitForNetworkIdle(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('Teacher can manage goals through their lifecycle', async () => {
        const lessonCard = page.locator('#lessons-accepted-section .card').last();

        const manageGoalsButton = lessonCard.getByRole('button', { name: /manage goals/i });
        await expect(manageGoalsButton, 'Manage goals button should be visible').toBeVisible();
        await manageGoalsButton.click();

        // Verify navigation to the lesson detail/goal page (URL might vary)
        await expect(page).toHaveURL(/.*\/teacher\/lessons\/[^/]+$/); // Check for UUID in URL
        await waitForNetworkIdle(page); // Wait after navigation

        // Verify the goal management section is visible by checking for the Add Goal Card
        await expect(
            page.locator('.add-goal-card'), // Locate the card using its class
            'Add goal card should be visible'
        ).toBeVisible();

        // Use the AddGoalForm directly (assuming it's the only one)
        const addGoalForm = page.locator('.add-goal-card');

        await addGoalForm.getByLabel('Goal Title').fill('Test Goal 1');
        await addGoalForm.getByLabel('Goal Description').fill('This is a test goal');
        await addGoalForm.getByLabel('Lessons to Achieve').fill('3');
        await addGoalForm.locator('#add-goal-button').click(); // Use the new ID
        await waitForNetworkIdle(page);

        // Verify goal appears in Ready to Start section
        const readySection = page.locator('section.goal-status-section:has(h3:has-text("Ready to Start"))');
        const newGoalCard = readySection.locator('.goal-card', { has: page.locator('.card-header h3:has-text("Test Goal 1")') });
        await expect(newGoalCard, 'New goal should appear in Ready to Start section').toBeVisible();

        // Start the goal
        const startButton = newGoalCard.getByRole('button', { name: /start/i });
        await expect(startButton, 'Start button should be visible').toBeVisible();
        await startButton.click();
        await waitForNetworkIdle(page);

        // Verify goal moved to In Progress section
        const inProgressSection = page.locator('section.goal-status-section:has(h3:has-text("In Progress"))');
        // Target the specific section heading using more classes
        const inProgressGoalCard = inProgressSection.locator('.goal-card', { has: page.locator('.card-header h3:has-text("Test Goal 1")') });
        await expect(inProgressGoalCard, 'Goal should appear in In Progress section').toBeVisible();
        await expect(readySection, 'Ready to Start section should be empty or not contain the goal').not.toContainText('Test Goal 1'); // Check goal is gone

        // Complete the goal
        const completeButton = inProgressGoalCard.getByRole('button', { name: /complete/i });
        await expect(completeButton, 'Complete button should be visible').toBeVisible();
        await completeButton.click();

        // Fill completion form using the new data-testid
        const completionModal = page.locator('[data-testid="goal-completion-modal"]'); // Use data-testid
        await expect(completionModal, 'Completion modal should appear').toBeVisible();
        // Target textarea by placeholder
        await completionModal.locator('textarea[placeholder*="Student successfully"]').fill('Goal completed successfully');
        // Target button by its exact text
        await completionModal.getByRole('button', { name: 'Confirm Completion' }).click();
        await waitForNetworkIdle(page);

        // Verify goal moved to Achieved section
        const achievedSection = page.locator('section.goal-status-section:has(h3:has-text("Achieved"))');
        // Target the specific section heading using more classes
        const completedGoalCard = achievedSection.locator('.goal-card', { has: page.locator('.card-header h3:has-text("Test Goal 1")') });
        await expect(completedGoalCard, 'Goal should appear in Achieved section').toBeVisible();
        await expect(inProgressSection, 'In Progress section should be empty or not contain the goal').not.toContainText('Test Goal 1'); // Check goal is gone
    });

    test('Teacher can complete a goal and define the lesson', async () => {
        // Navigate to the specific GOAL-FREE lesson's goals page again for isolation
        await page.goto('/teacher/lessons');
        await waitForNetworkIdle(page);
        // Target the LAST card in the defined section
        const lessonCard = page.locator('#lessons-accepted-section .card').last();

        const manageGoalsButton = lessonCard.getByRole('button', { name: /manage goals/i });
        await expect(manageGoalsButton, 'Manage goals button should be visible').toBeVisible();
        await manageGoalsButton.click();
        await expect(page).toHaveURL(/.*\/teacher\/lessons\/[^/]+$/);
        await waitForNetworkIdle(page);

        // Verify the goal management section is visible
        await expect(page.locator('.add-goal-card')).toBeVisible();
        const addGoalForm = page.locator('.add-goal-card');

        // Create a goal with a descriptive title
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

        // Fill completion form using the new data-testid
        const completionModal = page.locator('[data-testid="goal-completion-modal"]'); // Use data-testid
        await expect(completionModal, 'Completion modal should appear').toBeVisible();
        // Target textarea by placeholder
        await completionModal.locator('textarea[placeholder*="Student successfully"]').fill('Goal completed, ready for lesson definition');
        // Target button by its exact text
        await completionModal.getByRole('button', { name: 'Confirm Completion' }).click();
        await waitForNetworkIdle(page);

        // Check if goal is in Achieved section
        const achievedSection = page.locator('section.goal-status-section:has(h3:has-text("Achieved"))');
        const achievedGoal = achievedSection.locator('.goal-card', { has: page.locator(`.card-header h3:has-text("${goalTitle}")`) });
        await expect(achievedGoal, `Goal '${goalTitle}' should be in Achieved section`).toBeVisible();

    });
}); 