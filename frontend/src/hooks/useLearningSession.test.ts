import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdaptiveFlashcards, getAdaptiveLearningSummary, resetProgress } = vi.hoisted(() => ({
  getAdaptiveFlashcards: vi.fn(),
  getAdaptiveLearningSummary: vi.fn(),
  resetProgress: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: {
    getAdaptiveFlashcards,
    getAdaptiveLearningSummary,
    resetProgress,
  },
}));

vi.mock('../i18n/languageContext', async () => {
  const actual = await vi.importActual<typeof import('../i18n/staticCopy')>('../i18n/staticCopy');
  return {
    useTargetLanguage: () => 'de',
    useCopy: () => actual.getStaticCopy('en'),
  };
});

vi.mock('../learning/preferenceProfile', () => ({
  readSavedLearningPreferenceProfile: () => null,
}));

import { useLearningSession } from './useLearningSession';

const learningSummary = {
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

const card = {
  id: 2,
  word: 'Hund',
  translation: 'dog',
  language: 'de',
  image_base64: 'abc',
  confidence_score: 0,
  knowledge_level: 1,
  times_seen: 0,
  times_correct: 0,
  times_incorrect: 0,
  selection_reason: 'new',
};

beforeEach(() => {
  getAdaptiveFlashcards.mockReset();
  getAdaptiveLearningSummary.mockReset().mockResolvedValue(learningSummary);
  resetProgress.mockReset().mockResolvedValue({ cards_reviewed: 0, known_count: 0, unknown_count: 0 });
});

describe('useLearningSession', () => {
  it('retries a transient flashcard load before showing an error', async () => {
    getAdaptiveFlashcards
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce([card]);

    const { result } = renderHook(() => useLearningSession());

    await act(async () => {
      await result.current.loadFlashcards(['animals']);
    });

    expect(getAdaptiveFlashcards).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.flashcards).toHaveLength(1));
  });
});
