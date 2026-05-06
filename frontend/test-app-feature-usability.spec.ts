import { expect, type Locator, type Page, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
}

async function expectInViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const viewport = page.viewportSize();
  const box = await locator.boundingBox();

  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

test('primary app features render usable and consistent surfaces', async ({ page }) => {
  const browserFailures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) {
      browserFailures.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown request failure';
    if (!failure.includes('net::ERR_ABORTED')) {
      browserFailures.push(`${request.url()} ${failure}`);
    }
  });
  page.on('pageerror', (error) => browserFailures.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Daily Learning Snapshot')).toBeVisible();
  await expectInViewport(page, page.getByRole('button', { name: 'Review German Level' }));
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Review German Level' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expectInViewport(page, page.getByRole('button', { name: "Don't know", exact: true }));
  await expectInViewport(page, page.getByRole('button', { name: 'Know', exact: true }));
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Build your topic deck' })).toBeVisible();
  await expectInViewport(page, page.getByRole('button', { name: 'Apply Filters' }));
  await page.getByRole('button', { name: 'Apply Filters' }).click();

  await page.goto('http://127.0.0.1:5173/library');
  await expect(page.getByText('Word Library')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Showing\s+\d+\s+words/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('http://127.0.0.1:5173/library/words/2/db-row');
  await expect(page.getByRole('heading', { name: 'der Hund', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'words' })).toBeVisible();
  await expect(page.getByText('translation family')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('http://127.0.0.1:5173/grammar');
  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
  const labViews = page.getByLabel('Grammar Lab views');

  await expect(labViews.getByRole('button', { name: /Sentence Graph/i })).toBeVisible();
  await expect(page.locator('svg').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Word Cloud/i }).click();
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 15000 });
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Build Sentence/i }).click();
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
  await expectInViewport(page, page.getByRole('heading', { name: /Build Area/i }));
  await expectInViewport(page, page.getByRole('button', { name: /Validate Sentence/i }));
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Componi Frase/i }).click();
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Nouns', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verbs', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Adverbs', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prepositions', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Clusters/i }).click();
  await expect(page.getByRole('button', { name: /Immagini/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('svg').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Dialetti/i }).click();
  await expect(page.getByText(/Mappa Dialetti|Nessun dialetto disponibile/)).toBeVisible({ timeout: 15000 });
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Hierarchy/i }).click();
  await expect(page.getByLabel('Hierarchy grouping criteria').getByRole('button', { name: /Categoria/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('svg').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  expect(browserFailures).toEqual([]);
});
