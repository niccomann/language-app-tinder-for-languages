import type { AdaptiveLearningSummary, UserProgress } from '../types';
import { copy } from '../i18n/staticCopy';
import { readStorageValue, removeStorageValue, writeStorageValue } from '../utils/browserStorage';

export const FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY = 'languageApp:firstVocabularyOnboardingDone:v1';
export const FIRST_VOCABULARY_ONBOARDING_TEST_BYPASS_STORAGE_KEY = 'languageApp:firstVocabularyOnboardingTestBypass:v1';
export const ONBOARDING_PREFERENCES_STORAGE_KEY = 'languageApp:onboardingPreferences:v1';
export const MIN_VOCABULARY_SCAN_SWIPES = 20;
export const MAX_VOCABULARY_SCAN_SWIPES = 30;

export type OnboardingPreferenceAnswer = string | string[];
export type OnboardingPreferenceAnswers = Record<string, OnboardingPreferenceAnswer>;

export interface VocabularySignal {
  word: string;
  category: string;
  known: boolean;
}

export interface VocabularyInsights {
  knownEstimate: number;
  reviewEstimate: number;
  strongCategory: string;
  weakCategory: string;
}

export function buildVocabularyInsights(signals: VocabularySignal[]): VocabularyInsights {
  const knownEstimate = signals.filter((signal) => signal.known).length;
  const reviewEstimate = signals.length - knownEstimate;
  const buckets = new Map<string, { known: number; review: number; total: number }>();

  for (const signal of signals) {
    const current = buckets.get(signal.category) ?? { known: 0, review: 0, total: 0 };
    current.total += 1;
    if (signal.known) {
      current.known += 1;
    } else {
      current.review += 1;
    }
    buckets.set(signal.category, current);
  }

  const ranked = [...buckets.entries()].map(([category, bucket]) => ({
    category,
    ...bucket,
    knownRate: bucket.total === 0 ? 0 : bucket.known / bucket.total,
    reviewRate: bucket.total === 0 ? 0 : bucket.review / bucket.total,
  }));

  const strongCategory = [...ranked]
    .sort((left, right) => right.knownRate - left.knownRate || right.known - left.known || right.total - left.total)[0]?.category ?? copy.onboarding.categories.fallbackStrong;
  const weakCategory = [...ranked]
    .sort((left, right) => right.reviewRate - left.reviewRate || right.review - left.review || right.total - left.total)[0]?.category ?? copy.onboarding.categories.fallbackWeak;

  return {
    knownEstimate,
    reviewEstimate,
    strongCategory,
    weakCategory,
  };
}

export function formatVocabularyCategory(category?: string) {
  if (!category) return copy.onboarding.categories.fallbackMixed;
  return category
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function readFirstVocabularyOnboardingDone() {
  return (
    readStorageValue(FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY) === 'true'
    || readStorageValue(FIRST_VOCABULARY_ONBOARDING_TEST_BYPASS_STORAGE_KEY) === 'true'
  );
}

export function markFirstVocabularyOnboardingDone() {
  writeStorageValue(FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY, 'true');
}

export function readOnboardingPreferences(): OnboardingPreferenceAnswers {
  const storedPreferences = readStorageValue(ONBOARDING_PREFERENCES_STORAGE_KEY);
  if (!storedPreferences) return {};

  try {
    const parsed = JSON.parse(storedPreferences) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => (
          typeof value === 'string'
          || (Array.isArray(value) && value.every((item) => typeof item === 'string'))
        )),
      ) as OnboardingPreferenceAnswers
      : {};
  } catch {
    return {};
  }
}

export function saveOnboardingPreferences(answers: OnboardingPreferenceAnswers) {
  writeStorageValue(ONBOARDING_PREFERENCES_STORAGE_KEY, JSON.stringify(answers));
}

export function clearOnboardingPreferences() {
  removeStorageValue(ONBOARDING_PREFERENCES_STORAGE_KEY);
}

export function hasVocabularyHistory(
  learningSummary: AdaptiveLearningSummary | null,
  progress: UserProgress,
) {
  return (
    (learningSummary?.total_words_practiced ?? 0) > 0
    || progress.cards_reviewed > 0
    || progress.known_count > 0
    || progress.unknown_count > 0
  );
}

export function shouldShowFirstVocabularyOnboarding(params: {
  mode: string;
  firstVocabularyOnboardingDone: boolean;
  learningSummaryLoaded: boolean;
  learningSummary: AdaptiveLearningSummary | null;
  progress: UserProgress;
}) {
  return (
    params.mode === 'path'
    && !params.firstVocabularyOnboardingDone
    && params.learningSummaryLoaded
    && params.learningSummary !== null
    && !hasVocabularyHistory(params.learningSummary, params.progress)
  );
}
