import { describe, expect, it } from 'vitest';
import { shouldShowFirstVocabularyOnboarding } from './firstVocabularyOnboardingMeta';
import type { AdaptiveLearningSummary, UserProgress } from '../types';

const emptyProgress: UserProgress = {
  cards_reviewed: 0,
  known_count: 0,
  unknown_count: 0,
};

const emptySummary: AdaptiveLearningSummary = {
  average_confidence: 0,
  average_knowledge_level: 1,
  total_words_practiced: 0,
  total_practice_sessions: 0,
  words_struggling: 0,
  words_learning: 0,
  words_mastered: 0,
  path_xp: 0,
  path_level: 1,
  max_path_level: 400,
  xp_to_next_level: 100,
  path_level_progress: 0,
  trend: 'new',
  level_delta: 0,
  last_practiced: null,
  days_since_last_practice: null,
  should_reengage: false,
};

describe('shouldShowFirstVocabularyOnboarding', () => {
  it('waits for a loaded summary before treating a user as first-run', () => {
    expect(shouldShowFirstVocabularyOnboarding({
      mode: 'path',
      firstVocabularyOnboardingDone: false,
      learningSummaryLoaded: false,
      learningSummary: null,
      progress: emptyProgress,
    })).toBe(false);
  });

  it('does not show first-run onboarding when backend vocabulary history exists', () => {
    expect(shouldShowFirstVocabularyOnboarding({
      mode: 'path',
      firstVocabularyOnboardingDone: false,
      learningSummaryLoaded: true,
      learningSummary: {
        ...emptySummary,
        total_words_practiced: 12,
      },
      progress: emptyProgress,
    })).toBe(false);
  });
});
