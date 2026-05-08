import { expect, test } from '@playwright/test';
import { APP_URL, FEATURE_GUIDE_STORAGE_PREFIX } from './test-utils/appTestHelpers';

test('feature guide opens as a full-screen introduction before entering a feature', async ({ page }) => {
  await page.goto(APP_URL);
  await page.evaluate((prefix) => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    }
  }, FEATURE_GUIDE_STORAGE_PREFIX);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${APP_URL}/grammar/build-sentence`);

  const guide = page.getByTestId('game-guide-overlay');
  await expect(guide).toBeVisible({ timeout: 15000 });
  await expect(guide).toHaveAttribute('data-layout', 'fullscreen');
  await expect(guide).toHaveAttribute('data-guide-id', 'sentenceGraphBuilder');
  await expect(guide).toHaveAttribute('aria-modal', 'true');
  await expect(guide).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(guide.getByRole('heading', { name: 'Componi con i nodi' })).toBeVisible();

  const guideBox = await guide.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(guideBox).not.toBeNull();
  expect(guideBox!.width).toBeGreaterThanOrEqual(viewport!.width - 4);
  expect(guideBox!.height).toBeGreaterThanOrEqual(viewport!.height - 4);

  const guideImage = guide.locator('[data-asset-rendering="transparent-cutout"] img');
  await expect(guideImage).toBeVisible();
  const imageBox = await guideImage.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(imageBox!.width).toBeGreaterThanOrEqual(260);
  expect(imageBox!.height).toBeGreaterThanOrEqual(260);

  await guide.getByRole('button', { name: 'Mostrami i nodi' }).click();

  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });

  await page.reload();
  await expect(page.getByTestId('game-guide-overlay')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
});

test('feature guide plays the intro frame swap after cutout images are ready', async ({ page }) => {
  await page.route('**/*guide_sentence_graph_builder_*.png', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    await route.continue();
  });

  await page.goto(APP_URL);
  await page.evaluate((prefix) => {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    }
  }, FEATURE_GUIDE_STORAGE_PREFIX);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${APP_URL}/grammar/build-sentence`);

  const guide = page.getByTestId('game-guide-overlay');
  await expect(guide).toBeVisible({ timeout: 15000 });

  const guideImage = guide.locator('[data-asset-rendering="transparent-cutout"] img');
  await expect(guideImage).toBeVisible();
  await guideImage.evaluate((image: HTMLImageElement) => new Promise<void>((resolve, reject) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error('Guide cutout failed to load')), { once: true });
  }));

  const firstFrame = await guideImage.getAttribute('src');
  await expect.poll(async () => guideImage.getAttribute('src'), { timeout: 1200 }).toContain('guide_sentence_graph_builder_b');
  await expect.poll(async () => guideImage.getAttribute('src'), { timeout: 1600 }).toBe(firstFrame);
});
