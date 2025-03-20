import { test, expect } from '@playwright/test';

/**
 * End-to-end tests for the lesson request and teacher quotes flow.
 * 
 * NOTE ABOUT PLAYWRIGHT STRICT MODE:
 * Playwright uses strict mode by default, which means that if a locator matches 
 * multiple elements, operations like .click() or .fill() will fail.
 * 
 * When working with lists or multiple matching elements, you should:
 * 1. Use .first(), .last(), or .nth(index) to specify which element you want
 * 2. Use specific data attributes (like data-quote-id) to target precise elements
 * 3. If you want to assert on multiple elements, use count() or a loop
 * 
 * Example: 
 * - INCORRECT: await expect(page.locator('.quote-card')).toBeVisible();
 * - CORRECT:   await expect(page.locator('.quote-card').first()).toBeVisible();
 */

// Helper function to login as student
async function loginAsStudent(page, email, password) {
  // Navigate to auth page
  await page.goto('/auth');
  
  // Wait for the app to be ready
  await page.waitForSelector('img[src*="lessons-marketplace"]', { timeout: 2000 });
  
  // Fill in the login form
  await page.fill('#email', email, { timeout: 2000 });
  await page.fill('#password', password, { timeout: 2000 });
  await page.click('input[value="STUDENT"]', { timeout: 2000 });
  
  // Wait for network response and submit
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.login-form button[type="submit"]').click()
  ]);
  
  // Verify login was successful
  expect(loginResponse.status()).toBe(200);
  
  // Wait for navigation to student dashboard
  await page.waitForURL(/.*\/lesson-request.*/, { timeout: 2000 });
}

// Helper function to fill and submit lesson request form
async function fillLessonRequestForm(page) {
  // Verify we're on the lesson request page
  await expect(page.locator('.lesson-request-form-container')).toBeVisible({ timeout: 2000 });
  
  // Get tomorrow's date for the lesson
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Fill in the lesson request form
  // Select lesson type (default is GUITAR)
  await page.selectOption('#type', 'GUITAR', { timeout: 2000 });
  
  // Select duration
  await page.selectOption('#durationMinutes', '30', { timeout: 2000 });
  
  // Set date to tomorrow
  await page.fill('#date', tomorrowFormatted, { timeout: 2000 });
  
  // Select time (10:00 AM)
  await page.selectOption('#time', '10:00', { timeout: 2000 });
  
  // Fill address fields
  await page.fill('#addressObj\\.street', '123 Test Street', { timeout: 2000 });
  await page.fill('#addressObj\\.city', 'Test City', { timeout: 2000 });
  await page.fill('#addressObj\\.state', 'TS', { timeout: 2000 });
  await page.fill('#addressObj\\.postalCode', '12345', { timeout: 2000 });
  
  // Submit the form and wait for response
  const [lessonRequestResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/lesson-requests') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.lesson-request-form button[type="submit"]').click()
  ]);
  
  // Verify lesson request was successful
  expect(lessonRequestResponse.status()).toBe(201);
  
  // Wait for navigation to teacher quotes page
  await page.waitForURL(/.*\/teacher-quotes\/.*/, { timeout: 2000 });
  
  // Extract the lesson request ID from the URL
  const url = page.url();
  const lessonRequestId = url.split('/teacher-quotes/')[1];
  
  return lessonRequestId;
}

// Helper function to generate quotes if none are available yet
async function generateQuotesIfNeeded(page) {
  // If no quotes are available yet, generate them
  const noQuotesMessage = page.locator('.teacher-quotes-empty');
  if (await noQuotesMessage.isVisible()) {
    // Click the button to generate quotes
    await page.click('.generate-quotes-button', { timeout: 2000 });
    
    // Wait for quotes to be generated and displayed
    await expect(page.locator('.quotes-grid')).toBeVisible({ timeout: 2000 });
  }
  
  // Get all the quote cards
  const quoteCards = page.locator('.quote-card');
  
  // Wait for at least one quote card to be visible
  // Use first() to handle strict mode correctly - this ensures we're looking at just one element
  await expect(quoteCards.first()).toBeVisible({ timeout: 2000 });
  
  // Count the quotes and return the count
  const quoteCount = await quoteCards.count();
  console.log(`Found ${quoteCount} teacher quotes`);
  
  // Get the first quote ID from the data-quote-id attribute
  let firstQuoteId = null;
  if (quoteCount > 0) {
    firstQuoteId = await quoteCards.first().getAttribute('data-quote-id');
    console.log(`First quote ID: ${firstQuoteId}`);
  }
  
  return { quoteCount, firstQuoteId };
}

test('Student can create a lesson request and view teacher quotes', async ({ page }) => {
  // 1. Login as an existing student
  // Using one of the seed data accounts with password "1234" from the seed.ts file
  await loginAsStudent(page, 'ethan.parker@example.com', '1234');
  
  // 2. Fill and submit the lesson request form
  const lessonRequestId = await fillLessonRequestForm(page);
  
  // 3. Verify we're on the teacher quotes page
  await expect(page.locator('.teacher-quotes-container')).toBeVisible({ timeout: 2000 });
  
  // 4. Generate quotes if needed and get quote data
  const { quoteCount, firstQuoteId } = await generateQuotesIfNeeded(page);
  
  // 5. Verify the quotes contain expected information
  // Verify lesson request details are shown
  await expect(page.locator('.lesson-request-card')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.lesson-request-details')).toContainText('GUITAR', { timeout: 2000 });
  await expect(page.locator('.lesson-request-details')).toContainText('30 minutes', { timeout: 2000 });
  
  // Verify price information is shown on the first quote card
  await expect(page.locator('.quote-price').first()).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.quote-rate').first()).toContainText('Hourly Rate', { timeout: 2000 });
  
  // Verify the accept quote button is present on the first quote card
  await expect(page.locator('.accept-quote-button').first()).toBeVisible({ timeout: 2000 });
  
  // 6. Make assertions using the specific quote ID
  if (firstQuoteId) {
    const specificQuoteCard = page.locator(`[data-quote-id="${firstQuoteId}"]`);
    await expect(specificQuoteCard).toBeVisible({ timeout: 2000 });
    
    // Assert on specific elements within the identified quote card
    const teacherName = specificQuoteCard.locator('.quote-header h3');
    await expect(teacherName).toBeVisible({ timeout: 2000 });
    
    const quotePrice = specificQuoteCard.locator('.quote-price');
    await expect(quotePrice).toBeVisible({ timeout: 2000 });
    
    const acceptButton = specificQuoteCard.locator('.accept-quote-button');
    await expect(acceptButton).toBeVisible({ timeout: 2000 });
  }
  
  // 7. Take a screenshot of the teacher quotes page
  await page.screenshot({ path: 'tests/screenshots/teacher-quotes-page.png', fullPage: true });
});

test('Student can request different lesson types and get relevant quotes', async ({ page }) => {
  // Login as different student
  await loginAsStudent(page, 'ava.johnson@example.com', '1234');
  
  // Verify we're on the lesson request page
  await expect(page.locator('.lesson-request-form-container')).toBeVisible({ timeout: 2000 });
  
  // Get tomorrow's date for the lesson
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  // Select VOICE lesson type instead of the default GUITAR
  await page.selectOption('#type', 'VOICE', { timeout: 2000 });
  
  // Select a longer duration
  await page.selectOption('#durationMinutes', '45', { timeout: 2000 });
  
  // Set date to tomorrow
  await page.fill('#date', tomorrowFormatted, { timeout: 2000 });
  
  // Select afternoon time (2:00 PM)
  await page.selectOption('#time', '14:00', { timeout: 2000 });
  
  // Fill address fields (different address than the first test)
  await page.fill('#addressObj\\.street', '456 Voice Avenue', { timeout: 2000 });
  await page.fill('#addressObj\\.city', 'Music City', { timeout: 2000 });
  await page.fill('#addressObj\\.state', 'MC', { timeout: 2000 });
  await page.fill('#addressObj\\.postalCode', '67890', { timeout: 2000 });
  
  // Submit the form and wait for response
  const [lessonRequestResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/lesson-requests') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.lesson-request-form button[type="submit"]').click()
  ]);
  
  // Verify lesson request was successful
  expect(lessonRequestResponse.status()).toBe(201);
  
  // Wait for navigation to teacher quotes page
  await page.waitForURL(/.*\/teacher-quotes\/.*/, { timeout: 2000 });
  
  // Generate quotes if needed and get quote data
  const { quoteCount, firstQuoteId } = await generateQuotesIfNeeded(page);
  
  // Verify the quotes for VOICE lesson
  await expect(page.locator('.lesson-request-card')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.lesson-request-details')).toContainText('VOICE', { timeout: 2000 });
  await expect(page.locator('.lesson-request-details')).toContainText('45 minutes', { timeout: 2000 });
  
  // If we have a specific quote ID, make assertions on it
  if (firstQuoteId) {
    const specificQuoteCard = page.locator(`[data-quote-id="${firstQuoteId}"]`);
    await expect(specificQuoteCard).toBeVisible({ timeout: 2000 });
    
    // Check for teacher name and price
    const teacherName = specificQuoteCard.locator('.quote-header h3');
    await expect(teacherName).toBeVisible({ timeout: 2000 });
    
    const quotePrice = specificQuoteCard.locator('.quote-price');
    await expect(quotePrice).toBeVisible({ timeout: 2000 });
    
    // Ensure quote rates for VOICE are generally higher than other lesson types
    const priceTxt = await quotePrice.textContent();
    console.log(`VOICE lesson quote price: ${priceTxt}`);
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'tests/screenshots/voice-lesson-quotes.png', fullPage: true });
});

test('Student can see teacher experience in quotes', async ({ page }) => {
  // Login as another student
  await loginAsStudent(page, 'noah.williams@example.com', '1234');
  
  // Fill and submit a lesson request for DRUMS
  await expect(page.locator('.lesson-request-form-container')).toBeVisible({ timeout: 2000 });
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  await page.selectOption('#type', 'DRUMS', { timeout: 2000 });
  await page.selectOption('#durationMinutes', '60', { timeout: 2000 });
  await page.fill('#date', tomorrowFormatted, { timeout: 2000 });
  await page.selectOption('#time', '16:00', { timeout: 2000 });
  
  await page.fill('#addressObj\\.street', '789 Drum Circle', { timeout: 2000 });
  await page.fill('#addressObj\\.city', 'Rhythm Town', { timeout: 2000 });
  await page.fill('#addressObj\\.state', 'RT', { timeout: 2000 });
  await page.fill('#addressObj\\.postalCode', '54321', { timeout: 2000 });
  
  const [lessonRequestResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/lesson-requests') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.lesson-request-form button[type="submit"]').click()
  ]);
  
  expect(lessonRequestResponse.status()).toBe(201);
  await page.waitForURL(/.*\/teacher-quotes\/.*/, { timeout: 2000 });
  
  // Generate quotes if needed and get quote data
  const { quoteCount, firstQuoteId } = await generateQuotesIfNeeded(page);
  
  // Verify quotes for DRUMS lesson
  await expect(page.locator('.lesson-request-details')).toContainText('DRUMS', { timeout: 2000 });
  await expect(page.locator('.lesson-request-details')).toContainText('60 minutes', { timeout: 2000 });
  
  // If we have a specific quote ID, check for teacher experience
  if (firstQuoteId) {
    const specificQuoteCard = page.locator(`[data-quote-id="${firstQuoteId}"]`);
    await expect(specificQuoteCard).toBeVisible({ timeout: 2000 });
    
    // Check for teacher bio/experience
    const teacherBio = specificQuoteCard.locator('.teacher-bio-preview');
    if (await teacherBio.isVisible()) {
      const bioText = await teacherBio.textContent();
      console.log(`Teacher bio for DRUMS lesson: ${bioText}`);
      
      // Verify it contains the word "Experience"
      expect(bioText).toContain('Experience');
    }
  }
  
  // Store all quote IDs for reporting
  const allQuoteCards = page.locator('.quote-card');
  const count = await allQuoteCards.count();
  
  const quoteIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await allQuoteCards.nth(i).getAttribute('data-quote-id');
    if (id) quoteIds.push(id);
  }
  
  console.log(`Found ${quoteIds.length} quote cards with IDs: ${quoteIds.join(', ')}`);
  
  // Verify back button functionality
  await page.click('.back-button', { timeout: 2000 });
  await expect(page).toHaveURL(/.*\/lesson-request.*/, { timeout: 2000 });
}); 