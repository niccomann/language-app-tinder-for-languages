import { test, expect } from '@playwright/test';
import {
  APP_URL,
  markFeatureGuidesSeen,
  mockUserApi,
  seedLanguageSettings,
  seedUserId,
  type MockUserProfile,
} from './test-utils/appTestHelpers';

const WIZARD_BYPASS_UUID = '00000000-0000-4000-8000-000000000099';
const WIZARD_BYPASS_PROFILE: MockUserProfile = {
  user_id: WIZARD_BYPASS_UUID,
  display_name: 'TestUser',
  age: null,
  target_language: 'de',
  proficiency_level: 'beginner',
  daily_goal_minutes: 10,
  onboarding_completed: true,
};

test.beforeEach(async ({ page }) => {
  await seedUserId(page, WIZARD_BYPASS_UUID);
  await seedLanguageSettings(page);
  await mockUserApi(page, WIZARD_BYPASS_PROFILE);
  await markFeatureGuidesSeen(page);
});

test('library has a direct route', async ({ page }) => {
  await page.goto(`${APP_URL}/library`);

  await expect(page.getByText('Word Library')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Hund/i }).first()).toBeVisible({ timeout: 15000 });
});

test('word detail exposes the complete database row', async ({ page }) => {
  await page.goto(`${APP_URL}/library/words/2/db-row`);
  await expect(page.getByText('Word Library')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'der Hund', exact: true })).toBeVisible({ timeout: 15000 });

  await expect(page.getByRole('heading', { name: 'words' })).toBeVisible();
  await expect(page.getByText('hypernym').first()).toBeVisible();
  await expect(page.getByText('Tier', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('image_base64_length')).toBeVisible();
  await expect(page.getByText('translation family')).toBeVisible();
  await expect(page.getByText('dog', { exact: true }).first()).toBeVisible();
});

test('verb detail exposes conjugation rows', async ({ page }) => {
  await page.goto(`${APP_URL}/library/words/109/db-row`);

  await expect(page.getByRole('heading', { name: 'schreiben', level: 2 })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('verb conjugations')).toBeVisible();
  await expect(page.getByText('schreibe', { exact: true })).toBeVisible();
});
