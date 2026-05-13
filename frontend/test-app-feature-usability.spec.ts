import { expect, test } from '@playwright/test';
import {
  APP_URL,
  expectInViewport,
  expectNoHorizontalOverflow,
  markFeatureGuidesSeen,
  markFirstVocabularyOnboardingDone,
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
});

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
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);

  await page.goto(`${APP_URL}/`);
  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Daily Learning Snapshot')).toBeVisible();
  await expectInViewport(page, page.getByRole('button', { name: 'Continue path' }));
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Continue path' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expectInViewport(page, page.getByRole('button', { name: "Don't know", exact: true }));
  await expectInViewport(page, page.getByRole('button', { name: 'Know', exact: true }));
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Build your topic deck' })).toBeVisible();
  await expectInViewport(page, page.getByRole('button', { name: 'Apply Filters' }));
  await page.getByRole('button', { name: 'Apply Filters' }).click();

  await page.goto(`${APP_URL}/library`);
  await expect(page.getByText('Word Library')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Showing\s+\d+\s+of\s+\d+\s+words/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(`${APP_URL}/library/words/2/db-row`);
  await expect(page.getByRole('heading', { name: 'der Hund', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'words' })).toBeVisible();
  await expect(page.getByText('translation family')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(`${APP_URL}/grammar`);
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
  await expect(page.getByRole('heading', { name: 'Articles', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conjunctions', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle word: der', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle word: und', exact: true })).toBeVisible();
  await expectInViewport(page, page.getByRole('heading', { name: /Build Area/i }));
  await expectInViewport(page, page.getByRole('button', { name: /Validate Sentence/i }));
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Compose Sentence/i }).click();
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Nouns', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verbs', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Adverbs', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prepositions', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Clusters/i }).click();
  await expect(page.getByRole('button', { name: /Images/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('svg').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Dialects/i }).click();
  await expect(page.getByText(/Dialect Map|No dialect data available/)).toBeVisible({ timeout: 15000 });
  await expectNoHorizontalOverflow(page);

  await labViews.getByRole('button', { name: /Hierarchy/i }).click();
  await expect(page.getByLabel('Hierarchy grouping criteria').getByRole('button', { name: /Category/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('svg').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  expect(browserFailures).toEqual([]);
});
