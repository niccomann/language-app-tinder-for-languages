import { expect, test } from '@playwright/test';
import { APP_URL, markFeatureGuidesSeen } from './test-utils/appTestHelpers';

test.beforeEach(async ({ page }) => {
  await markFeatureGuidesSeen(page);
});

test('clustered D3 nodes render word images inside circular nodes', async ({ page }) => {
  await page.goto(`${APP_URL}/grammar`);

  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Clusters/i }).click();

  const nodeImages = page.locator('g.node image[href^="data:image"], g.node image[href^="https://"]');
  await expect(nodeImages.first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Images ON/i })).toBeVisible();
});
