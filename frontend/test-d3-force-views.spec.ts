import { expect, test, type Page } from '@playwright/test';
import {
  APP_URL,
  markFeatureGuidesSeen,
  mockLearningApi,
  mockUserApi,
  seedLanguageSettings,
  seedUserId,
  type MockUserProfile,
} from './test-utils/appTestHelpers';

const BYPASS_UUID = '00000000-0000-4000-8000-000000000123';
const BYPASS_PROFILE: MockUserProfile = {
  user_id: BYPASS_UUID,
  display_name: 'TestUser',
  age: null,
  target_language: 'de',
  proficiency_level: 'beginner',
  daily_goal_minutes: 10,
  onboarding_completed: true,
};

// Library returns FlashcardWithProgress[]; GrammarLab maps them into
// WordCloudItem[]. We only need the fields that get propagated.
const MOCK_LIBRARY_WORDS = [
  { id: 1, word: 'Katze', translation: 'cat', language: 'de', category: 'animal', swipe_right_count: 5, review_count: 3 },
  { id: 2, word: 'Hund', translation: 'dog', language: 'de', category: 'animal', swipe_right_count: 4, review_count: 2 },
  { id: 3, word: 'laufen', translation: 'to run', language: 'de', category: 'verb', swipe_right_count: 3, review_count: 2 },
  { id: 4, word: 'springen', translation: 'to jump', language: 'de', category: 'verb', swipe_right_count: 2, review_count: 1 },
  { id: 5, word: 'schnell', translation: 'fast', language: 'de', category: 'adverb', swipe_right_count: 2, review_count: 1 },
  { id: 6, word: 'rot', translation: 'red', language: 'de', category: 'adjective', swipe_right_count: 1, review_count: 1 },
];

const MOCK_GRAMMAR_NODES = [
  { id: 'n1', label: 'die Katze', type: 'subject' },
  { id: 'n2', label: 'läuft', type: 'predicate' },
  { id: 'n3', label: 'schnell', type: 'adverb' },
];

const MOCK_GRAMMAR_SENTENCES = [
  {
    id: 's1',
    german: 'Die Katze läuft schnell.',
    english: 'The cat runs fast.',
    difficulty: 'A1',
    nodes: [
      { id: 'n1', label: 'die Katze', type: 'subject' },
      { id: 'n2', label: 'läuft', type: 'predicate' },
      { id: 'n3', label: 'schnell', type: 'adverb' },
    ],
    edges: [
      { source: 'n1', target: 'n2', label: 'subj' },
      { source: 'n2', target: 'n3', label: 'mod' },
    ],
  },
];

async function seedGrammarLab(page: Page) {
  await seedUserId(page, BYPASS_UUID);
  await seedLanguageSettings(page);
  await mockUserApi(page, BYPASS_PROFILE);
  await markFeatureGuidesSeen(page);
  await mockLearningApi(page);

  await page.route('**/api/library/words**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LIBRARY_WORDS) });
  });
  await page.route('**/api/grammar/sentences**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GRAMMAR_SENTENCES) });
  });
  await page.route('**/api/grammar/available-nodes**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GRAMMAR_NODES) });
  });
}

test.describe('D3 force-based views', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      console.log('[browser pageerror]', err.message);
    });
    await seedGrammarLab(page);
  });

  test('ClusteredNodes mounts and renders cluster nodes', async ({ page }) => {
    await page.goto(`${APP_URL}/grammar`);
    await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Clusters/i }).click();

    const nodes = page.locator('g.node');
    await expect(nodes.first()).toBeVisible({ timeout: 15000 });

    // SVG hosts the simulation and zoom controls are reachable.
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('ClusteredNodes survives criteria switching without crashing', async ({ page }) => {
    await page.goto(`${APP_URL}/grammar`);
    await page.getByRole('button', { name: /Clusters/i }).click();
    await expect(page.locator('g.node').first()).toBeVisible({ timeout: 15000 });

    // Try rhyme criterion if the chip is exposed; tolerate either label.
    const rhymeChip = page.getByRole('button', { name: /Rim[ae]|Rhyme/i });
    if (await rhymeChip.count()) {
      await rhymeChip.first().click();
      await expect(page.locator('g.node').first()).toBeVisible();
    }

    // Toggling Images ON/OFF re-runs the render path.
    const imagesToggle = page.getByRole('button', { name: /Images ON|Images OFF/i });
    if (await imagesToggle.count()) {
      await imagesToggle.first().click();
      await expect(page.locator('g.node').first()).toBeVisible();
    }
  });

  test('FunSentenceBuilder mounts on the funbuilder tab without errors', async ({ page }) => {
    let pageErrors = 0;
    page.on('pageerror', () => { pageErrors += 1; });

    await page.goto(`${APP_URL}/grammar`);
    await expect(page.getByRole('heading', { name: /Grammar Lab/i })).toBeVisible({ timeout: 15000 });

    // Switch to the fun builder view. The label may vary by locale.
    const funTab = page.getByRole('button', { name: /Fun.*Builder|Costruisci/i });
    if (await funTab.count()) {
      await funTab.first().click();
      // Empty canvas should still render its frame and not throw.
      await expect(page.locator('svg').first()).toBeVisible({ timeout: 10000 });
    }

    expect(pageErrors).toBe(0);
  });
});
