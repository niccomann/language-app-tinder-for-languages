import { test, expect } from '@playwright/test';

test('debug learning screen', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`[${msg.type()}] ${text}`);
  });
  
  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    const text = error.message;
    pageErrors.push(text);
    console.log(`[PAGE ERROR] ${text}`);
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  // Screenshot initial
  await page.screenshot({ path: 'test-results/debug-01-home.png', fullPage: true });
  
  // Select a category
  const catButton = page.locator('button:has-text("animals")').first();
  await catButton.click();
  await page.waitForTimeout(500);
  
  // Click start
  const startButton = page.locator('button:has-text("Start Learning")');
  await startButton.click();
  await page.waitForTimeout(3000);
  
  // Screenshot learning screen
  await page.screenshot({ path: 'test-results/debug-02-learning.png', fullPage: true });
  
  // Check what's on the page
  const bodyText = await page.locator('body').textContent();
  console.log('Body text:', bodyText?.substring(0, 500));
  
  // Check if card exists
  const card = page.locator('.cursor-grab, [class*="Card"]').first();
  const cardCount = await card.count();
  console.log(`Cards found: ${cardCount}`);
  
  // Check for loading spinner
  const loading = page.locator('text=/Loading|loading/i');
  const loadingCount = await loading.count();
  console.log(`Loading indicators: ${loadingCount}`);
  
  // Check for errors
  const error = page.locator('text=/Error|error|failed/i');
  const errorCount = await error.count();
  console.log(`Error messages: ${errorCount}`);
  
  // Log all console messages
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));
  
  console.log('\n=== Page Errors ===');
  pageErrors.forEach(err => console.log(err));
  
  // Expectations
  expect(cardCount).toBeGreaterThan(0);
});
