import { expect, test } from '@playwright/test';
import { APP_URL, expectInViewport, markFeatureGuidesSeen } from './test-utils/appTestHelpers';

test.beforeEach(async ({ page }) => {
  await markFeatureGuidesSeen(page);
});

async function getWordBankBox(page) {
  const wordBank = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Word Bank', exact: true }) })
    .first();
  await expect(wordBank).toBeVisible({ timeout: 15000 });
  const box = await wordBank.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

test('grammar lab keeps the shared game menu visible inside builder views', async ({ page }) => {
  await page.goto(`${APP_URL}/grammar`);

  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
  const labViews = page.getByLabel('Grammar Lab views');

  await labViews.getByRole('button', { name: /Build Sentence/i }).click();
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Sentence Graph/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Word Cloud/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Componi Frase/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Clusters/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Dialetti/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Hierarchy/i })).toBeVisible();

  await labViews.getByRole('button', { name: /Componi Frase/i }).click();
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible();
  await expect(labViews.getByRole('button', { name: /Sentence Graph/i })).toBeVisible();
});

test('build sentence keeps the build area usable in the first viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP_URL}/grammar`);

  const labViews = page.getByLabel('Grammar Lab views');
  await labViews.getByRole('button', { name: /Build Sentence/i }).click();

  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
  const buildAreaHeading = page.getByRole('heading', { name: /Build Area/i });
  const validateButton = page.getByRole('button', { name: /Validate Sentence/i });

  await expectInViewport(page, buildAreaHeading);
  await expectInViewport(page, validateButton);
});

test('sentence builder variants use the same page frame width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP_URL}/grammar`);

  const labViews = page.getByLabel('Grammar Lab views');

  await labViews.getByRole('button', { name: /Build Sentence/i }).click();
  const buildSentenceBox = await getWordBankBox(page);

  await labViews.getByRole('button', { name: /Componi Frase/i }).click();
  const composeSentenceBox = await getWordBankBox(page);

  expect(Math.abs(buildSentenceBox.x - composeSentenceBox.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(buildSentenceBox.width - composeSentenceBox.width)).toBeLessThanOrEqual(4);
});
