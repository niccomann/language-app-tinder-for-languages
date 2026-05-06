import { expect, test } from '@playwright/test';

test('word library total reflects all German flashcards instead of the first limited page', async ({ page }) => {
  const response = await page.request.get('http://127.0.0.1:8501/api/library/words?language=de&limit=1000');
  expect(response.ok()).toBeTruthy();
  const allGermanWords = await response.json();

  await page.goto('http://127.0.0.1:5173/library');

  await expect(page.getByRole('heading', { name: 'Word Library' })).toBeVisible();

  const totalCard = page
    .getByText('Total', { exact: true })
    .first()
    .locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');

  await expect(totalCard.getByText(String(allGermanWords.length), { exact: true })).toBeVisible({ timeout: 15000 });
});
