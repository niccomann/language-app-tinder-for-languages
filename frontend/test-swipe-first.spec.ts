import { expect, test } from '@playwright/test';
import {
  APP_URL,
  clearFirstVocabularyOnboardingDone,
  expectInViewport,
  markFeatureGuidesSeen,
  markFirstVocabularyOnboardingDone,
  mockLearningApi,
  stallLibraryFiltersApi,
} from './test-utils/appTestHelpers';

test('first visit starts with the swipe-only vocabulary scan', async ({ page }) => {
  await mockLearningApi(page, {
    average_confidence: 0,
    average_knowledge_level: 1,
    total_words_practiced: 0,
    total_practice_sessions: 0,
    words_struggling: 0,
    words_learning: 0,
    words_mastered: 0,
    path_xp: 0,
    path_level: 1,
    xp_to_next_level: 100,
    path_level_progress: 0,
    trend: 'new',
    level_delta: 0,
    last_practiced: null,
    days_since_last_practice: null,
  });
  await clearFirstVocabularyOnboardingDone(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Vocabulary Scan' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Prima capiamo quali parole sai.')).toBeVisible();
  await expect(page.getByRole('button', { name: "Don't know", exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Know', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Library' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Grammar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveCount(0);
});

test('home starts on the learning path and enters the swipe deck', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Daily Learning Snapshot')).toBeVisible();
  await expect(page.getByText('400-level path', { exact: true })).toBeVisible();
  await expect(page.getByText('XP to next level', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue path' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Sentence Placement mission/i })).toBeVisible();

  await page.getByRole('button', { name: 'Continue path' }).click();

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

test('home leaves loading state when the category API stalls', async ({ page }) => {
  await stallLibraryFiltersApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);

  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeVisible({ timeout: 7000 });
  await expect(page.getByText('Failed to load categories. Make sure the backend is running.')).toBeVisible();
  await expect(page.getByText('Loading...')).toHaveCount(0);
});

test('home opens sentence placement from the learning path', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Sentence Placement' }).click();

  await expect(page.getByRole('heading', { name: 'Grammar Placement' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Sentence-based level check')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Translate this sentence' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Tap the words in the right order.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
});

test('home shows prominent gamified topic filters', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

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
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Continue path' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Learning System' })).toBeVisible();

  await page.getByRole('button', { name: 'Learning System' }).click();

  await expect(page.getByText('One memory database tracks every word you know, miss, or are still learning.')).toBeVisible();
  await expect(page.getByText('Your global path can grow through 400 levels.')).toBeVisible();
  await expect(page.getByText('Each word still has a focused mastery score from 1 to 10.')).toBeVisible();
  await expect(page.getByText('Future sentences can mix strong words with weaker words, keeping context useful without overload.')).toBeVisible();
});

test('home keeps the swipe card and decision buttons usable in the first viewport', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Continue path' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  const knowButton = page.getByRole('button', { name: 'Know', exact: true });
  const dontKnowButton = page.getByRole('button', { name: "Don't know", exact: true });

  await expect(knowButton).toBeVisible({ timeout: 15000 });
  await expect(dontKnowButton).toBeVisible();

  await expectInViewport(page, knowButton);
  await expectInViewport(page, dontKnowButton);
});

test('home presents a constrained guided mission flow without hiding existing features', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'German Learning Path' })).toBeVisible({ timeout: 15000 });
  const missionFlow = page.getByTestId('guided-mission-flow');
  await expect(missionFlow).toBeVisible();
  await expect(missionFlow.getByRole('button', { name: /Continue path/i })).toBeVisible();
  await expect(missionFlow.getByRole('button', { name: /Continue path/i })).toHaveCount(1);
  await expect(missionFlow.getByText('Mission 1')).toBeVisible();
  await expect(missionFlow.getByText('Vocabulary Review')).toBeVisible();
  await expect(missionFlow.getByText('Mission 2')).toBeVisible();
  await expect(missionFlow.getByText('Sentence Placement')).toBeVisible();
  await expect(missionFlow.getByText('Mission 3')).toBeVisible();
  await expect(missionFlow.getByText('Grammar Lab')).toBeVisible();
  await expect(missionFlow.getByText('Collection', { exact: true })).toBeVisible();
  await expect(missionFlow.getByText('Word Library')).toBeVisible();
  await expect(missionFlow.getByText('Advanced exploration')).toBeVisible();

  await missionFlow.getByRole('button', { name: /Open Sentence Placement mission/i }).click();

  await expect(page).toHaveURL(`${APP_URL}/placement/sentence`);
  await expect(page.getByRole('heading', { name: 'Grammar Placement' })).toBeVisible({ timeout: 15000 });
});
