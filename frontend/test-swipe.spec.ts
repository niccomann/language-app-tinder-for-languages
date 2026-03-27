import { test, expect } from '@playwright/test';

test.describe('Tinder for Languages - Swipe Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-initial.png' });
  });

  test('should load categories and select them', async ({ page }) => {
    // Check if we're on the category selection screen
    await expect(page.locator('text=WORD QUEST')).toBeVisible();
    
    // Wait for categories to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of categories
    await page.screenshot({ path: 'test-results/02-categories.png' });
    
    // Click on some categories (animals, food, colors)
    const categories = ['animals', 'food', 'colors'];
    for (const cat of categories) {
      const catButton = page.locator(`button:has-text("${cat}")`).first();
      if (await catButton.isVisible().catch(() => false)) {
        await catButton.click();
        console.log(`Selected category: ${cat}`);
      }
    }
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/03-selected.png' });
    
    // Click Start Learning button
    const startButton = page.locator('button:has-text("Start Learning")');
    await expect(startButton).toBeVisible();
    await startButton.click();
    
    // Wait for learning screen
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/04-learning.png' });
  });

  test('should swipe cards', async ({ page }) => {
    // Select categories and start
    await page.waitForTimeout(2000);
    
    // Click on a category
    const catButton = page.locator('button').filter({ hasText: /animals/i }).first();
    if (await catButton.isVisible().catch(() => false)) {
      await catButton.click();
    }
    
    // Click Start Learning
    const startButton = page.locator('button:has-text("Start Learning")');
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Check if we're on learning screen
    await page.screenshot({ path: 'test-results/05-before-swipe.png' });
    
    // Try to find a card and swipe it
    const card = page.locator('.cursor-grab').first();
    
    if (await card.isVisible().catch(() => false)) {
      console.log('Card found, attempting swipe...');
      
      // Get card bounding box
      const box = await card.boundingBox();
      if (box) {
        console.log(`Card position: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
        
        // Swipe right (know)
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        
        await card.dragTo(card, {
          sourcePosition: { x: startX, y: startY },
          targetPosition: { x: startX + 200, y: startY },
        });
        
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-results/06-after-swipe.png' });
        
        // Check if progress updated
        const progressText = await page.locator('text=/Cards/i').textContent().catch(() => '');
        console.log(`Progress: ${progressText}`);
      }
    } else {
      console.log('No card found on screen');
      
      // Check for errors
      const errorText = await page.locator('.text-red-500, .text-red-600').textContent().catch(() => '');
      if (errorText) {
        console.log(`Error found: ${errorText}`);
      }
    }
  });
});
