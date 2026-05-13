import { expect, type Locator, type Page } from '@playwright/test';
import { featureGuideIds } from '../src/gamification/featureGuideIds';
import { FEATURE_GUIDE_STORAGE_PREFIX } from '../src/gamification/featureGuideStorage';

export const APP_URL = process.env.PLAYWRIGHT_APP_URL ?? 'http://127.0.0.1:5173';
export const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8501';
export const FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY = 'languageApp:firstVocabularyOnboardingDone:v1';
export const FIRST_VOCABULARY_ONBOARDING_TEST_BYPASS_STORAGE_KEY = 'languageApp:firstVocabularyOnboardingTestBypass:v1';
export { FEATURE_GUIDE_STORAGE_PREFIX };

export const DEFAULT_LEARNING_SUMMARY = {
  average_confidence: 0.62,
  average_knowledge_level: 4.4,
  total_words_practiced: 24,
  total_practice_sessions: 4,
  words_struggling: 3,
  words_learning: 12,
  words_mastered: 9,
  path_xp: 620,
  path_level: 7,
  max_path_level: 400,
  xp_to_next_level: 80,
  path_level_progress: 42,
  trend: 'improving',
  level_delta: 1,
  last_practiced: '2026-05-07T08:00:00Z',
  days_since_last_practice: 0,
  should_reengage: false,
};

export const MOCK_SENTENCE_CHALLENGE = {
  id: 1,
  language: 'de',
  prompt_language: 'en',
  target_language: 'de',
  prompt: 'I unfortunately do not want to run today.',
  correct_sentence: 'Ich will heute leider nicht laufen',
  correct_tokens: ['Ich', 'will', 'heute', 'leider', 'nicht', 'laufen'],
  distractor_tokens: ['Katze', 'Garten', 'und'],
  option_tokens: ['Ich', 'will', 'Katze', 'heute', 'leider', 'Garten', 'nicht', 'laufen', 'und'],
  difficulty: 'A1',
  grammar_focus: 'word_order',
  cefr_level: 'A1',
  validation_mode: 'ground_truth',
};

const MOCK_CARDS = [
  {
    id: 1,
    word: 'Katze',
    translation: 'cat',
    language: 'de',
    category: 'animal',
    confidence_score: 0.3,
    knowledge_level: 2,
    times_seen: 0,
    times_correct: 0,
    times_incorrect: 0,
    selection_reason: 'new',
  },
  {
    id: 2,
    word: 'laufen',
    translation: 'to run',
    language: 'de',
    category: 'verb',
    confidence_score: 0.4,
    knowledge_level: 3,
    times_seen: 1,
    times_correct: 1,
    times_incorrect: 0,
    selection_reason: 'learning',
  },
  {
    id: 3,
    word: 'schnell',
    translation: 'fast',
    language: 'de',
    category: 'adverb',
    confidence_score: 0.6,
    knowledge_level: 5,
    times_seen: 2,
    times_correct: 2,
    times_incorrect: 0,
    selection_reason: 'review',
  },
];

export async function markFirstVocabularyOnboardingDone(page: Page) {
  await page.addInitScript(({ doneKey }) => {
    window.localStorage.setItem(doneKey, 'true');
  }, {
    doneKey: FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY,
  });
}

export async function markFeatureGuidesSeen(page: Page) {
  await page.addInitScript(({ prefix, guideIds }) => {
    for (const guideId of guideIds) {
      window.localStorage.setItem(`${prefix}${guideId}`, 'true');
    }
  }, { prefix: FEATURE_GUIDE_STORAGE_PREFIX, guideIds: featureGuideIds });
}

export async function clearFirstVocabularyOnboardingDone(page: Page) {
  await page.addInitScript(({ doneKey, bypassKey }) => {
    window.localStorage.removeItem(doneKey);
    window.localStorage.removeItem(bypassKey);
  }, {
    doneKey: FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY,
    bypassKey: FIRST_VOCABULARY_ONBOARDING_TEST_BYPASS_STORAGE_KEY,
  });
}

export async function mockLearningApi(
  page: Page,
  summaryOverrides: Partial<typeof DEFAULT_LEARNING_SUMMARY> = {},
) {
  const summary = { ...DEFAULT_LEARNING_SUMMARY, ...summaryOverrides };

  await page.route('**/api/library/filters?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cefr_levels: ['A1', 'A2'],
        frequency_bands: ['core'],
        registers: ['neutral'],
        genders: ['feminine', 'masculine', 'neuter'],
        parts_of_speech: ['noun', 'verb', 'adverb', 'article', 'preposition', 'conjunction'],
        word_formations: ['simple'],
        categories: ['animal', 'verb', 'adverb', 'concept'],
        thematic_domains: ['daily life'],
      }),
    });
  });

  await page.route('**/api/cards/adaptive?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CARDS),
    });
  });

  await page.route('**/api/statistics/adaptive-summary?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    });
  });

  await page.route('**/api/statistics/all?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          word: 'schnell',
          language: 'de',
          confidence_score: 88,
          knowledge_level: 9,
          times_seen: 8,
          times_correct: 7,
          times_incorrect: 1,
          last_practiced: '2026-05-07T08:00:00Z',
        },
        {
          word: 'laufen',
          language: 'de',
          confidence_score: 42,
          knowledge_level: 5,
          times_seen: 4,
          times_correct: 2,
          times_incorrect: 2,
          last_practiced: '2026-05-07T08:00:00Z',
        },
        {
          word: 'Katze',
          language: 'de',
          confidence_score: 0,
          knowledge_level: 1,
          times_seen: 1,
          times_correct: 0,
          times_incorrect: 1,
          last_practiced: '2026-05-07T08:00:00Z',
        },
      ]),
    });
  });

  await page.route('**/api/progress', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cards_reviewed: 1, known_count: 1, unknown_count: 0 }),
    });
  });

  await page.route('**/api/statistics/update', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ word: 'Katze', knowledge_level: 3, confidence_score: 0.45 }),
    });
  });

  await page.route('**/api/grammar/sentence-challenges?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([MOCK_SENTENCE_CHALLENGE]),
    });
  });
}

export async function stallLibraryFiltersApi(page: Page) {
  await page.route('**/api/library/filters?**', async () => new Promise(() => {}));
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
}

export async function expectInViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const viewport = page.viewportSize();
  const box = await locator.boundingBox();

  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

// ---------------------------------------------------------------------------
// User / Onboarding API helpers
// ---------------------------------------------------------------------------

export const USER_ID_STORAGE_KEY = 'languageApp:userId:v1';
export const TARGET_LANGUAGE_STORAGE_KEY = 'languageApp:targetLanguage:v1';
export const SOURCE_LOCALE_STORAGE_KEY = 'languageApp:sourceLocale:v1';

export interface MockUserProfile {
  user_id: string;
  display_name: string;
  age: number | null;
  target_language: string;
  proficiency_level: 'beginner' | 'a1_a2' | 'b1_b2';
  daily_goal_minutes: number;
  onboarding_completed: boolean;
}

export async function seedUserId(page: Page, uuid: string): Promise<void> {
  await page.addInitScript(({ key, value }: { key: string; value: string }) => {
    window.localStorage.setItem(key, value);
  }, { key: USER_ID_STORAGE_KEY, value: uuid });
}

export async function clearUserIdentity(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    window.localStorage.removeItem(key);
  }, USER_ID_STORAGE_KEY);
}

/**
 * Seed both target language and source locale so the OnboardingModal does not
 * intercept on load. Defaults to German target + English source.
 */
export async function seedLanguageSettings(
  page: Page,
  target: string = 'de',
  source: string = 'en',
): Promise<void> {
  await page.addInitScript(
    ({ tKey, tVal, sKey, sVal }: { tKey: string; tVal: string; sKey: string; sVal: string }) => {
      window.localStorage.setItem(tKey, tVal);
      window.localStorage.setItem(sKey, sVal);
    },
    {
      tKey: TARGET_LANGUAGE_STORAGE_KEY,
      tVal: target,
      sKey: SOURCE_LOCALE_STORAGE_KEY,
      sVal: source,
    },
  );
}

/**
 * Mock the /api/users surface. By default (profile=null) all GETs 404,
 * POST creates 201, PATCH 200. Pass a profile to simulate an existing user.
 */
export async function mockUserApi(page: Page, profile: MockUserProfile | null = null): Promise<{
  /** Mutable list of POST bodies seen — assert after the wizard runs. */
  posts: unknown[];
  /** Mutable list of PATCH bodies seen, paired with the path-extracted user_id. */
  patches: Array<{ userId: string; body: unknown }>;
}> {
  const posts: unknown[] = [];
  const patches: Array<{ userId: string; body: unknown }> = [];

  await page.route('**/api/users', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      posts.push(body);
      if (profile && profile.user_id === body.user_id) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profile),
        });
        return;
      }
      const created: MockUserProfile = {
        user_id: body.user_id,
        display_name: body.display_name,
        age: body.age ?? null,
        target_language: body.target_language ?? 'de',
        proficiency_level: body.proficiency_level ?? 'beginner',
        daily_goal_minutes: body.daily_goal_minutes ?? 10,
        onboarding_completed: false,
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }
    await route.fallback();
  });

  await page.route(/.*\/api\/users\/[^/?]+$/, async (route) => {
    const url = new URL(route.request().url());
    const userId = decodeURIComponent(url.pathname.split('/').pop() ?? '');
    const method = route.request().method();
    if (method === 'GET') {
      if (profile && profile.user_id === userId) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profile),
        });
        return;
      }
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"User not found"}' });
      return;
    }
    if (method === 'PATCH') {
      const body = route.request().postDataJSON();
      patches.push({ userId, body });
      const base: MockUserProfile = profile && profile.user_id === userId
        ? profile
        : {
            user_id: userId,
            display_name: 'mock',
            age: null,
            target_language: 'de',
            proficiency_level: 'beginner',
            daily_goal_minutes: 10,
            onboarding_completed: false,
          };
      const merged: MockUserProfile = { ...base, ...(body as Partial<MockUserProfile>) };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(merged),
      });
      return;
    }
    await route.fallback();
  });

  return { posts, patches };
}
