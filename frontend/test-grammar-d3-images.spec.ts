import { expect, test } from '@playwright/test';
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

test('clustered D3 nodes render word images inside circular nodes', async ({ page }) => {
  await page.goto(`${APP_URL}/grammar`);

  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Clusters/i }).click();

  const nodeImages = page.locator('g.node image[href^="data:image"], g.node image[href^="https://"]');
  await expect(nodeImages.first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Images ON/i })).toBeVisible();
});
