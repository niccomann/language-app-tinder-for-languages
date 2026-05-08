import { expect, test } from '@playwright/test';
import {
  APP_URL,
  MOCK_SENTENCE_CHALLENGE,
  markFeatureGuidesSeen,
  markFirstVocabularyOnboardingDone,
  mockLearningApi,
} from './test-utils/appTestHelpers';

test.beforeEach(async ({ page }) => {
  await markFeatureGuidesSeen(page);
});

test('learning features have direct routes', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);

  await page.goto(`${APP_URL}/learn`);
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(`${APP_URL}/learn`);

  await page.goto(`${APP_URL}/learn/filters`);
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('dialog', { name: 'Build your topic deck' })).toBeVisible();

  await page.goto(`${APP_URL}/learn/system`);
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('One memory database tracks every word you know, miss, or are still learning.')).toBeVisible();

  await page.goto(`${APP_URL}/placement/sentence`);
  await expect(page.getByRole('heading', { name: 'Grammar Placement' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Translate this sentence' })).toBeVisible({ timeout: 15000 });
});

test('sentence placement uses a guided Duolingo-style word choice exercise', async ({ page }) => {
  await mockLearningApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP_URL}/placement/sentence`);

  await expect(page.getByRole('heading', { name: 'Grammar Placement' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Translate this sentence' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Tap the words in the right order.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toHaveCount(0);

  const challenge = page.getByTestId('sentence-placement-challenge');
  const options = challenge.getByTestId('placement-word-option');

  await expect(options.first()).toBeVisible({ timeout: 15000 });

  const optionCount = await options.count();
  const imageCountInsideWordOptions = await options.locator('img').count();

  expect(optionCount).toBeGreaterThanOrEqual(6);
  expect(optionCount).toBeLessThanOrEqual(12);
  expect(imageCountInsideWordOptions).toBe(0);
});

test('sentence placement gives dynamic mascot feedback while preserving the compact word bank', async ({ page }) => {
  await mockLearningApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP_URL}/placement/sentence`);

  const challenge = page.getByTestId('sentence-placement-challenge');
  const mascot = challenge.getByTestId('mascot-reaction');
  const promptBubble = challenge.getByTestId('sentence-prompt-bubble');
  await expect(mascot).toBeVisible({ timeout: 15000 });
  await expect(promptBubble.getByTestId('mascot-speech-bubble')).toBeVisible();
  await expect(promptBubble.getByTestId('streaming-speech-text')).toHaveAttribute('data-typewriter-interval-ms', '24');
  await expect(mascot).toHaveAttribute('data-speaking', 'true');
  await expect(promptBubble.getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'complete', { timeout: 10000 });
  await expect(mascot).toHaveAttribute('data-speaking', 'false');
  await expect(mascot.locator('img')).toHaveAttribute('alt', /Language coach mascot/i);
  await expect(mascot.locator('[data-asset-rendering="transparent-cutout"]')).toBeVisible();
  await expect(mascot.locator('[data-asset-rendering="transparent-cutout"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(mascot).toHaveAttribute('data-mascot-persona', 'coach');
  await expect(mascot).toHaveAttribute('data-motion-mode', 'still');
  await expect(mascot).toHaveAttribute('data-motion-profile', 'still');
  await expect(challenge.getByText('Quest')).toBeVisible();
  await expect(challenge.getByText('Combo')).toBeVisible();

  for (const token of MOCK_SENTENCE_CHALLENGE.correct_tokens) {
    await challenge.getByTestId('placement-word-option').filter({ hasText: token }).first().click();
  }

  await challenge.getByRole('button', { name: 'Check' }).click();
  await expect(mascot).toHaveAttribute('data-reaction-state', 'correct');
  await expect(mascot).toHaveAttribute('data-mascot-persona', 'explorer');
  await expect(mascot).toHaveAttribute('data-motion-mode', 'event');
  await expect(mascot).toHaveAttribute('data-motion-profile', 'explorerSwoop');
  await expect(challenge.getByTestId('sentence-feedback-bubble').getByTestId('mascot-speech-bubble')).toBeVisible();
  await expect(challenge.getByTestId('sentence-feedback-bubble').getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'complete', { timeout: 10000 });
  await expect(challenge.getByText('XP reward')).toBeVisible();
  await expect(challenge.getByRole('heading', { name: 'Good job.' })).toBeVisible();
});

test('learning swipe feedback uses the same streaming mascot speech pattern', async ({ page }) => {
  await mockLearningApi(page);
  await markFirstVocabularyOnboardingDone(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${APP_URL}/learn`);
  await expect(page.getByRole('heading', { name: 'Learn German' })).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'Know', exact: true }).click();

  const feedbackBubble = page.getByTestId('learning-feedback-bubble');
  await expect(feedbackBubble.getByTestId('mascot-reaction')).toBeVisible({ timeout: 15000 });
  await expect(feedbackBubble.getByTestId('mascot-speech-bubble')).toBeVisible();
  await expect(feedbackBubble.getByTestId('streaming-speech-text')).toHaveAttribute('data-typewriter-interval-ms', '24');
  await expect(feedbackBubble.getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'complete', { timeout: 10000 });
  await expect(feedbackBubble.getByText('Katze reached Mastery 3')).toBeVisible();
});

test('grammar lab feature tabs have direct routes', async ({ page }) => {
  const routes = [
    ['/grammar/graph', 'Sentence Graph'],
    ['/grammar/word-cloud', 'Word Cloud'],
    ['/grammar/build-sentence', 'Build Sentence'],
    ['/grammar/compose-sentence', 'Compose Sentence'],
    ['/grammar/clusters', 'Clusters'],
    ['/grammar/dialects', 'Dialects'],
    ['/grammar/hierarchy', 'Hierarchy'],
  ] as const;

  for (const [route, tabName] of routes) {
    await page.goto(`${APP_URL}${route}`);
    await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Grammar Lab views').getByRole('button', { name: tabName })).toHaveAttribute('aria-pressed', 'true');
  }

  await page.goto(`${APP_URL}/grammar/build-sentence`);
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });

  await page.goto(`${APP_URL}/grammar/compose-sentence`);
  await expect(page.getByRole('heading', { name: /Word Bank/i })).toBeVisible({ timeout: 15000 });
});

test('grammar lab shell stays usable while shared grammar data is loading', async ({ page }) => {
  await page.route(/\/api\/grammar\/sentences$/, async () => new Promise(() => {}));
  await page.route(/\/api\/library\/words\?/, async () => new Promise(() => {}));

  await page.goto(`${APP_URL}/grammar/build-sentence`);

  await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 2500 });
  await expect(page.getByLabel('Grammar Lab views').getByRole('button', { name: 'Build Sentence' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Loading Grammar Lab...')).toHaveCount(0);
});

test('library list and word detail features have direct routes', async ({ page }) => {
  await page.goto(`${APP_URL}/library/filters`);
  await expect(page.getByText('Word Library')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Filter by CEFR level')).toBeVisible({ timeout: 15000 });

  await page.goto(`${APP_URL}/library/words/2/overview`);
  await expect(page.getByRole('heading', { name: 'der Hund', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /Overview/i })).toHaveAttribute('aria-pressed', 'true');

  await page.goto(`${APP_URL}/library/words/2/db-row`);
  await expect(page.getByRole('heading', { name: 'der Hund', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'words' })).toBeVisible();
});
