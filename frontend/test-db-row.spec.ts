import { test, expect } from '@playwright/test';

test('library has a direct route', async ({ page }) => {
  await page.goto('http://localhost:5173/library');

  await expect(page.getByText('Word Library')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Hund/i }).first()).toBeVisible();
});

test('word detail exposes the complete database row', async ({ page }) => {
  await page.goto('http://localhost:5173/library/words/2/db-row');
  await expect(page.getByText('Word Library')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'der Hund', exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'words' })).toBeVisible();
  await expect(page.getByText('hypernym')).toBeVisible();
  await expect(page.getByText('Tier', { exact: true })).toBeVisible();
  await expect(page.getByText('image_base64_length')).toBeVisible();
  await expect(page.getByText('translation family')).toBeVisible();
  await expect(page.getByText('chien', { exact: true })).toBeVisible();
});

test('verb detail exposes conjugation rows', async ({ page }) => {
  await page.goto('http://localhost:5173/library/words/103/db-row');

  await expect(page.getByRole('heading', { name: 'gehen', level: 2 })).toBeVisible();
  await expect(page.getByText('verb conjugations')).toBeVisible();
  await expect(page.getByText('gehe', { exact: true })).toBeVisible();
  await expect(page.getByText('bin gegangen', { exact: true })).toBeVisible();
});
