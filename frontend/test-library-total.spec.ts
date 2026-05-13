import { expect, test } from '@playwright/test';
import {
  API_URL,
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

test('word library total reflects all German flashcards instead of the first limited page', async ({ page }) => {
  const response = await page.request.get(`${API_URL}/api/library/words?language=de&limit=5000`);
  expect(response.ok()).toBeTruthy();
  const allGermanWords = await response.json();

  await page.goto(`${APP_URL}/library`);

  await expect(page.getByRole('heading', { name: 'Word Library' })).toBeVisible({ timeout: 15000 });

  const totalCard = page
    .getByText('Total', { exact: true })
    .first()
    .locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');

  await expect(totalCard.getByText(String(allGermanWords.length), { exact: true })).toBeVisible({ timeout: 15000 });
});

test('word library can progressively load more words', async ({ page }) => {
  await page.goto(`${APP_URL}/library`);

  await expect(page.getByRole('heading', { name: 'Word Library' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Showing\s+120\s+of\s+\d+\s+words/)).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /Load more words/i }).click();

  await expect(page.getByText(/Showing\s+240\s+of\s+\d+\s+words/)).toBeVisible({ timeout: 15000 });
});
