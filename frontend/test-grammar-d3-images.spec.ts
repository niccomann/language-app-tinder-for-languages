import { expect, test } from '@playwright/test';

test('clustered D3 nodes render word images inside circular nodes', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/grammar');

  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Clusters/i }).click();

  const nodeImages = page.locator('g.node image[href^="data:image/jpeg;base64"]');
  await expect(nodeImages.first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Immagini ON/i })).toBeVisible();
});
