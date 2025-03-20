import { test, expect } from '@playwright/test';

/**
 * End-to-end test for the complete lesson request flow.
 * Covers the entire user journey from login to confirmation.
 */

test('Complete end-to-end lesson booking flow', async ({ page }) => {
  // 1. Login as an existing student
  await page.goto('/auth');
  
  // Wait for the app to be ready
  await page.waitForSelector('img[src*="lessons-marketplace"]', { timeout: 2000 });
  
  // Fill in the login form with an existing student from seed data
  await page.fill('#email', 'ethan.parker@example.com', { timeout: 2000 });
  await page.fill('#password', '1234', { timeout: 2000 });
  await page.click('input[value="STUDENT"]', { timeout: 2000 });
  
  // Submit login form and wait for response
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 2000 }
    ),
    page.locator('.login-form button[type="submit"]').click()
  ]);
  
  // Verify login was successful
  expect(loginResponse.status()).toBe(200);
  console.log('Login successful');
  
  // 2. Fill out the lesson request form
  // Wait for form to be visible and fully loaded
  await expect(page.locator('.lesson-request-form-container')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#type')).toBeVisible({ timeout: 3000 });
  const optionCount = await page.locator('#type option').count();
  expect(optionCount).toBeGreaterThan(0);
  
  // Get tomorrow's date for the lesson
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
  
  // Fill in the lesson request form
  await page.selectOption('#type', 'GUITAR', { timeout: 3000 });
  await page.selectOption('#durationMinutes', '30', { timeout: 3000 });
  await page.fill('#date', tomorrowFormatted, { timeout: 3000 });
  await page.selectOption('#time', '10:00', { timeout: 3000 });
  
  // Fill address fields
  await page.fill('#addressObj\\.street', '123 Test Street', { timeout: 2000 });
  await page.fill('#addressObj\\.city', 'Test City', { timeout: 2000 });
  await page.fill('#addressObj\\.state', 'TS', { timeout: 2000 });
  await page.fill('#addressObj\\.postalCode', '12345', { timeout: 2000 });
  
  // 3. Submit the form and wait for response
  const [lessonRequestResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/lesson-requests') && response.request().method() === 'POST',
      { timeout: 3000 }
    ),
    page.locator('.lesson-request-form button[type="submit"]').click()
  ]);
  
  // Verify lesson request was successful
  expect(lessonRequestResponse.status()).toBe(201);
  
  // Extract the lesson request ID from the response for logging
  const responseBody = await lessonRequestResponse.json();
  const lessonRequestId = responseBody.id;
  console.log(`Created lesson request with ID: ${lessonRequestId}`);
  
  // Wait for navigation to teacher quotes page
  await page.waitForURL(/.*\/teacher-quotes\/.*/, { timeout: 3000 });
  
  // 4. Check for quotes and generate them if needed
  const noQuotesMessage = page.locator('.teacher-quotes-empty');
  if (await noQuotesMessage.isVisible()) {
    console.log('No quotes found, generating new quotes');
    await page.click('.generate-quotes-button', { timeout: 2000 });
  }
  
  // Wait for quotes to be visible
  await expect(page.locator('.quotes-grid')).toBeVisible({ timeout: 3000 });
  const quoteCards = page.locator('.quote-card');
  await expect(quoteCards.first()).toBeVisible({ timeout: 3000 });
  
  // Count available quotes
  const quoteCount = await quoteCards.count();
  console.log(`Found ${quoteCount} teacher quotes`);
  expect(quoteCount).toBeGreaterThan(0);
  
  // Get the first quote's ID and details
  const firstQuoteCard = quoteCards.first();
  const firstQuoteId = await firstQuoteCard.getAttribute('data-quote-id');
  console.log(`Selected quote ID: ${firstQuoteId}`);
  
  // Extract teacher name and price for verification
  const teacherNameElement = firstQuoteCard.locator('.quote-header h3');
  const teacherName = await teacherNameElement.textContent() || '';
  console.log(`Selected teacher: ${teacherName}`);
  
  const quotePriceElement = firstQuoteCard.locator('.quote-price');
  const quotePrice = await quotePriceElement.textContent() || '';
  console.log(`Quote price: ${quotePrice}`);
  
  // Take a screenshot of the quotes page
  await page.screenshot({ 
    path: `tests/screenshots/teacher-quotes-${lessonRequestId}.png`
  });
  
  // 5. Select a quote by clicking the accept button
  const acceptButton = firstQuoteCard.locator('.accept-quote-button');
  await expect(acceptButton).toBeVisible({ timeout: 2000 });
  
  // Click accept and wait for the API request
  const [acceptResponse] = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/lesson-quotes') && 
                 response.url().includes('/accept') && 
                 response.request().method() === 'POST',
      { timeout: 3000 }
    ),
    acceptButton.click()
  ]);
  
  // Verify the acceptance was successful
  expect(acceptResponse.status()).toBe(200);
  console.log('Quote acceptance successful');
  
  // 6. Verify the lesson confirmation page
  await page.waitForURL(/.*\/lesson-confirmation\/.*/, { timeout: 3000 });
  
  // Check for confirmation header
  await expect(page.locator('.confirmation-text h2')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('.confirmation-text h2')).toContainText('Lesson Confirmed', { timeout: 2000 });
  
  // Verify lesson details match what we selected
  await expect(page.locator('.lesson-details-card')).toBeVisible({ timeout: 2000 });
  
  // Check for GUITAR lesson type
  await expect(page.locator('.info-item:has-text("Lesson Type")')).toContainText('GUITAR', { timeout: 2000 });
  
  // Check for 30 minutes duration
  await expect(page.locator('.info-item:has-text("Duration")')).toContainText('30 minutes', { timeout: 2000 });
  
  // Verify the teacher name matches
  const teacherInfo = page.locator('.info-item:has-text("Teacher") .info-value');
  await expect(teacherInfo).toBeVisible({ timeout: 2000 });
  const confirmedTeacherName = await teacherInfo.textContent();
  expect(confirmedTeacherName?.trim()).toContain(teacherName.trim());
  
  // Verify the price matches
  const priceInfo = page.locator('.info-item:has-text("Price") .info-value');
  await expect(priceInfo).toBeVisible({ timeout: 2000 });
  const confirmedPrice = await priceInfo.textContent();
  expect(confirmedPrice?.trim()).toBe(quotePrice.trim());
  
  // Take a screenshot of the confirmation page
  await page.screenshot({ 
    path: `tests/screenshots/lesson-confirmation-${lessonRequestId}.png` 
  });
  
  // Verify "Book Another Lesson" button is present
  await expect(page.locator('.new-lesson-button')).toBeVisible({ timeout: 2000 });
  console.log('Test completed successfully: Full lesson booking flow verified');
}); 