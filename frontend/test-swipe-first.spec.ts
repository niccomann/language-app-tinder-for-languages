import { expect, test } from '@playwright/test';

test('home starts on the learning path and enters the swipe deck', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Daily Learning Snapshot')).toBeVisible();
  await expect(page.getByText('400-level path', { exact: true })).toBeVisible();
  await expect(page.getByText('XP to next level', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review German Level' })).toBeVisible();

  await page.getByRole('button', { name: 'Review German Level' }).click();

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Just decide: know it or not.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Know', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Start Learning/i })).toHaveCount(0);

  await page.getByRole('button', { name: 'Filters', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Build your topic deck' })).toBeVisible();
  await expect(page.getByText('Apply categories without leaving the deck.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
});

test('home shows prominent gamified topic filters', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Topics/i })).toBeVisible();

  await page.getByRole('button', { name: /Topics/i }).click();

  const filtersDialog = page.getByRole('dialog', { name: 'Build your topic deck' });
  await expect(filtersDialog.getByRole('heading', { name: 'Build your topic deck' })).toBeVisible();
  await expect(filtersDialog.getByText('Pick the packs you want in the swipe deck.')).toBeVisible();
  await expect(filtersDialog.getByRole('button', { name: /Animal Pack/i })).toBeVisible();
  await expect(filtersDialog.getByText('Game packs')).toBeVisible();
});

test('home explains the adaptive learning system in a compact menu', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/');

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Review German Level' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Learning System' })).toBeVisible();

  await page.getByRole('button', { name: 'Learning System' }).click();

  await expect(page.getByText('One memory database tracks every word you know, miss, or are still learning.')).toBeVisible();
  await expect(page.getByText('Your global path can grow through 400 levels.')).toBeVisible();
  await expect(page.getByText('Each word still has a focused mastery score from 1 to 10.')).toBeVisible();
  await expect(page.getByText('Future sentences can mix strong words with weaker words, keeping context useful without overload.')).toBeVisible();
});

test('home keeps the swipe card and decision buttons usable in the first viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173/');

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Review German Level' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  const knowButton = page.getByRole('button', { name: 'Know', exact: true });
  const dontKnowButton = page.getByRole('button', { name: "Don't know", exact: true });

  await expect(knowButton).toBeVisible({ timeout: 15000 });
  await expect(dontKnowButton).toBeVisible();

  const viewport = page.viewportSize();
  const knowBox = await knowButton.boundingBox();
  const dontKnowBox = await dontKnowButton.boundingBox();

  expect(viewport).not.toBeNull();
  expect(knowBox).not.toBeNull();
  expect(dontKnowBox).not.toBeNull();
  expect(knowBox!.y + knowBox!.height).toBeLessThanOrEqual(viewport!.height);
  expect(dontKnowBox!.y + dontKnowBox!.height).toBeLessThanOrEqual(viewport!.height);
});
