import { expect, test, type Page } from '@playwright/test';
import {
  APP_URL,
  clearFirstVocabularyOnboardingDone,
  expectInViewport,
  markFeatureGuidesSeen,
  markFirstVocabularyOnboardingDone,
  mockLearningApi,
  mockUserApi,
  seedLanguageSettings,
  seedUserId,
  stallLibraryFiltersApi,
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

test('first visit starts with a full-screen vocabulary intro before the swipe scan', async ({ page }) => {
  test.setTimeout(60000);
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

  const intro = page.getByTestId('vocabulary-intro');
  await expect(intro).toBeVisible({ timeout: 15000 });
  await expect(intro.getByTestId('mascot-reaction')).toBeVisible();
  await expect(intro.getByTestId('mascot-speech-bubble')).toBeVisible();
  await expect(intro.getByTestId('mascot-speech-bubble')).toHaveAttribute('data-speech-step-total', '4');
  await expect(intro.getByTestId('speech-bubble-tail')).toBeVisible();
  await expect(intro.getByTestId('speech-step-indicator')).toHaveText('1 / 4');
  await expect(intro.getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'streaming');
  await expect(intro.getByTestId('streaming-speech-text')).toHaveAttribute('data-typewriter-interval-ms', '24');
  await expect(intro.getByTestId('mascot-reaction')).toHaveAttribute('data-speaking', 'true');
  await expect(intro.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
  await expect(intro.getByText('This app starts from the vocabulary you actually know.')).toBeVisible();
  await expect(intro.getByText('we do not want to show you words you already know too often')).toBeVisible();

  await expect(intro.getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'complete', { timeout: 15000 });
  await expect(intro.getByRole('button', { name: 'Next page' })).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(intro.getByTestId('speech-step-indicator')).toHaveText('1 / 4');

  await intro.getByRole('button', { name: 'Next page' }).click();
  await expect(intro.getByTestId('speech-step-indicator')).toHaveText('2 / 4');
  await expect(intro.getByText('spend real mental effort learning words you may never use')).toBeVisible();
  await expect(intro.getByRole('button', { name: 'Start the scan' })).toHaveCount(0);

  await intro.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(intro.getByTestId('speech-step-indicator')).toHaveText('4 / 4');
  await expect(intro.getByText('Every word can have a different level')).toBeVisible();
  await expect(intro.getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'complete');
  await expect(intro.getByTestId('mascot-reaction')).toHaveAttribute('data-speaking', 'false');
  await expect(intro.getByRole('button', { name: 'Skip', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Vocabulary Scan' })).toHaveCount(0);

  await intro.getByRole('button', { name: 'Start the scan' }).click();
  await completePreferenceQuestionnaire(page);

  await expect(page.getByRole('heading', { name: 'Vocabulary Scan' })).toBeVisible({ timeout: 15000 });
  const scanBubble = page.getByTestId('vocabulary-scan-bubble');
  await expect(scanBubble.getByTestId('mascot-reaction')).toBeVisible();
  await expect(scanBubble.getByTestId('mascot-speech-bubble')).toBeVisible();
  await expect(scanBubble.getByTestId('streaming-speech-text')).toHaveAttribute('data-typewriter-interval-ms', '24');
  await expect(page.getByText('First we learn which words you know.')).toBeVisible();
  await expect(page.getByRole('button', { name: "Don't know", exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Know', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Library' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Grammar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toHaveCount(0);
});

async function completePreferenceQuestionnaire(page: Page) {
  const questionnaire = page.getByTestId('onboarding-preference-questionnaire');
  await expect(questionnaire).toBeVisible({ timeout: 15000 });

  for (let questionIndex = 0; questionIndex < 11; questionIndex += 1) {
    await questionnaire.locator('button[aria-pressed]').first().click();
    await questionnaire
      .getByRole('button', { name: questionIndex === 10 ? 'Start vocabulary scan' : 'Next question' })
      .click();
  }
}

async function skipIntroNarration(page: Page) {
  const intro = page.getByTestId('vocabulary-intro');
  await expect(intro).toBeVisible({ timeout: 15000 });
  await intro.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(intro.getByRole('button', { name: 'Start the scan' })).toBeVisible();
  return intro;
}

test('home starts on the learning path and enters the swipe deck', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Today's snapshot")).toBeVisible();
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

test('completed first-run setup opens the learning path on next app start', async ({ page }) => {
  await mockLearningApi(page);
  await markFeatureGuidesSeen(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('languageApp:firstVocabularyOnboardingDone:v1', 'true');
    window.localStorage.removeItem('languageApp:firstVocabularyOnboardingTestBypass:v1');
  });

  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('vocabulary-intro')).toHaveCount(0);
});

test('first-run setup is mandatory before the learning path is available', async ({ page }) => {
  await mockLearningApi(page);
  await clearFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  const intro = page.getByTestId('vocabulary-intro');
  await expect(intro).toBeVisible({ timeout: 15000 });
  await expect(intro.getByRole('button', { name: 'Skip setup' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Learn German' })).toHaveCount(0);

  await skipIntroNarration(page);
  await intro.getByRole('button', { name: 'Start the scan' }).click();
  const preferences = page.getByTestId('vocabulary-preferences');
  await expect(preferences).toBeVisible({ timeout: 15000 });
  await preferences.getByRole('button', { name: 'Back' }).click();

  await expect(page.getByTestId('vocabulary-intro')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Learn German' })).toHaveCount(0);
});

test('first setup questions allow selecting multiple options at once', async ({ page }) => {
  await mockLearningApi(page);
  await clearFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  const intro = page.getByTestId('vocabulary-intro');
  await expect(intro).toBeVisible({ timeout: 15000 });
  await skipIntroNarration(page);
  await intro.getByRole('button', { name: 'Start the scan' }).click();

  const preferences = page.getByTestId('vocabulary-preferences');
  await expect(preferences.getByRole('heading', { name: 'Modern, classic, or both?' })).toBeVisible({ timeout: 15000 });

  const modern = preferences.getByRole('button', { name: /Modern everyday/i });
  const classic = preferences.getByRole('button', { name: /Classic and cultural/i });

  await modern.click();
  await classic.click();

  await expect(modern).toHaveAttribute('aria-pressed', 'true');
  await expect(classic).toHaveAttribute('aria-pressed', 'true');
  await expect(preferences.getByText('Selected')).toHaveCount(2);
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

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Sentence Placement' }).click();

  await expect(page.getByRole('heading', { name: 'Grammar Placement' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Sentence-based level check')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Translate this sentence' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Tap the words in the right order.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
});

test('review hub keeps gamified topic filters one step away from the path', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Review tools/i }).click();

  await expect(page).toHaveURL(`${APP_URL}/review`);
  await expect(page.getByRole('heading', { name: 'Review & Setup' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Open Topic Deck/i }).click();

  const filtersDialog = page.getByRole('dialog', { name: 'Build your topic deck' });
  await expect(filtersDialog.getByRole('heading', { name: 'Build your topic deck' })).toBeVisible({ timeout: 15000 });
  await expect(filtersDialog.getByText('Pick the packs you want in the swipe deck.')).toBeVisible();
  await expect(filtersDialog.getByRole('button', { name: /Animal Pack/i })).toBeVisible();
  await expect(filtersDialog.getByText('Game packs')).toBeVisible();
});

test('home explains the adaptive learning system in a compact menu', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Continue path' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Learning System' })).toBeVisible();

  await page.getByRole('button', { name: 'Learning System' }).click();

  // Each item shows only its title; the description expands on click (split-text UX).
  const systemItems = [
    ['Unified word memory', 'One memory database tracks every word you know, miss, or are still learning.'],
    ['400-level path', 'Your global path can grow through 400 levels.'],
    ['Word mastery', 'Each word still has a focused mastery score from 1 to 10.'],
    ['Context difficulty', 'Future sentences can mix strong words with weaker words, keeping context useful without overload.'],
  ] as const;
  for (const [title, text] of systemItems) {
    await page.getByRole('button', { name: title }).click();
    await expect(page.getByText(text)).toBeVisible();
  }
  await expect(page.getByText('New Features')).toHaveCount(0);
  await expect(page.getByText('Latest session updates')).toHaveCount(0);
});

test('home keeps the swipe card and decision buttons usable in the first viewport', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Continue path' }).click();
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  const knowButton = page.getByRole('button', { name: 'Know', exact: true });
  const dontKnowButton = page.getByRole('button', { name: "Don't know", exact: true });

  await expect(knowButton).toBeVisible({ timeout: 15000 });
  await expect(dontKnowButton).toBeVisible();

  await expectInViewport(page, knowButton);
  await expectInViewport(page, dontKnowButton);
});

test('home prioritizes the next learning action and moves secondary features into hubs', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await markFeatureGuidesSeen(page);
  await page.goto(APP_URL);

  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  const focusFlow = page.getByTestId('path-focus-flow');
  await expect(focusFlow).toBeVisible();
  await expect(focusFlow.getByRole('button', { name: /Continue path/i })).toBeVisible();
  await expect(focusFlow.getByRole('button', { name: /Continue path/i })).toHaveCount(1);
  await expect(focusFlow.getByRole('button', { name: /Open Sentence Placement mission/i })).toBeVisible();
  await expect(focusFlow.getByRole('button', { name: /Review tools/i })).toBeVisible();
  await expect(focusFlow.getByRole('button', { name: /Explore tools/i })).toBeVisible();
  await expect(page.getByText('Advanced exploration')).toHaveCount(0);
  await expect(page.getByText('Word Cloud')).toHaveCount(0);
  await expect(page.getByText('Hierarchy')).toHaveCount(0);
  await expect(page.getByText('Product updates')).toHaveCount(0);
  await expect(page.getByText('New Features')).toHaveCount(0);

  await focusFlow.getByRole('button', { name: /Open Sentence Placement mission/i }).click();

  await expect(page).toHaveURL(`${APP_URL}/placement/sentence`);
  await expect(page.getByRole('heading', { name: 'Grammar Placement' })).toBeVisible({ timeout: 15000 });
});
