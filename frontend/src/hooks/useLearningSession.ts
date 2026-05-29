import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';
import { readSavedLearningPreferenceProfile } from '../learning/preferenceProfile';
import type { AdaptiveFlashcard, AdaptiveLearningSummary, LearningFeedback, MilestoneEvent, UserProgress } from '../types';
import { reportClientError } from '../utils/clientError';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';
import { getCefrLevelForPathLevel } from '../components/learningPathMeta';

const SESSION_CARD_LIMIT = 80;
const MILESTONE_STEP = 30;
const TRANSIENT_LOAD_RETRY_DELAYS_MS = [250, 750];

function isTransientLoadError(error: unknown) {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('request timed out') || message.includes('networkerror');
}

async function wait(ms: number) {
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function retryTransientLoad<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TRANSIENT_LOAD_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientLoadError(error) || attempt === TRANSIENT_LOAD_RETRY_DELAYS_MS.length) {
        break;
      }
      await wait(TRANSIENT_LOAD_RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

/**
 * Hook to manage learning session state and actions
 */
export const useLearningSession = () => {
  const language = useTargetLanguage();
  const copy = useCopy();
  const [flashcards, setFlashcards] = useState<AdaptiveFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<UserProgress>({
    cards_reviewed: 0,
    known_count: 0,
    unknown_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [learningSummary, setLearningSummary] = useState<AdaptiveLearningSummary | null>(null);
  const [learningSummaryLoaded, setLearningSummaryLoaded] = useState(false);
  const [learningFeedback, setLearningFeedback] = useState<LearningFeedback | null>(null);
  const [milestoneEvent, setMilestoneEvent] = useState<MilestoneEvent | null>(null);
  const currentPathLevel = learningSummary?.path_level ?? 1;
  const [swipeInFlight, setSwipeInFlight] = useState(false);
  const swipeInFlightRef = useRef(false);

  const loadLearningSummary = useCallback(async () => {
    try {
      const summary = await api.getAdaptiveLearningSummary(language);
      setLearningSummary(summary);
      return summary;
    } catch (err) {
      reportClientError('Failed to refresh learning summary:', err);
      setLearningSummary(null);
      return null;
    } finally {
      setLearningSummaryLoaded(true);
    }
  }, [language]);

  const loadFlashcards = useCallback(async (selectedCategories: string[]) => {
    try {
      setLoading(true);
      setError(null);
      if (selectedCategories.length === 0) {
        setFlashcards([]);
        setCurrentIndex(0);
        await loadLearningSummary();
        return;
      }

      const preferenceProfile = readSavedLearningPreferenceProfile();
      const maxCefrLevel = getCefrLevelForPathLevel(currentPathLevel);
      const [cards] = await Promise.all([
        retryTransientLoad(() => api.getAdaptiveFlashcards({
          language,
          selectedCategories,
          learningPreferenceProfile: preferenceProfile,
          limit: SESSION_CARD_LIMIT,
          maxCefrLevel,
        })),
        loadLearningSummary(),
      ]);
      setFlashcards(cards);
      setCurrentIndex(0);
      setLearningFeedback(null);
      swipeInFlightRef.current = false;
      setSwipeInFlight(false);
    } catch (err) {
      setError('Failed to load flashcards. Make sure the backend is running.');
      reportClientError('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  }, [language, currentPathLevel, loadLearningSummary]);

  const swipeTokenRef = useRef(0);
  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;
    if (swipeInFlightRef.current) return;

    const known = direction === 'right';
    const token = ++swipeTokenRef.current;
    let shouldAdvance = false;
    swipeInFlightRef.current = true;
    setSwipeInFlight(true);

    try {
      const updatedProgress = await api.recordProgress(currentCard.id, known);
      // Discard if a newer swipe superseded this one (out-of-order response).
      if (token !== swipeTokenRef.current) return;
      setProgress(updatedProgress);

      if (
        updatedProgress.cards_reviewed > 0
        && updatedProgress.cards_reviewed % MILESTONE_STEP === 0
      ) {
        setMilestoneEvent({ count: updatedProgress.cards_reviewed, id: Date.now() });
      }

      try {
        const updatedStatistics = await api.updateWordStatistics(currentCard.word, known, currentCard.language);
        if (token !== swipeTokenRef.current) return;
        if (updatedStatistics.knowledge_level > currentCard.knowledge_level) {
          setLearningFeedback({
            title: formatCopy(copy.learningFeedback.masteryReached, {
              word: currentCard.word,
              level: updatedStatistics.knowledge_level,
            }),
            message: formatCopy(copy.learningFeedback.masteryReachedBody, {
              language: copy.targetLanguageNames[language],
            }),
            tone: 'level_up',
          });
        } else if (updatedProgress.cards_reviewed > 0 && updatedProgress.cards_reviewed % 5 === 0) {
          setLearningFeedback({
            title: copy.learningFeedback.signalUpdatedTitle,
            message: copy.learningFeedback.signalUpdatedBody,
            tone: 'progress',
          });
        }
      } catch (err) {
        reportClientError('Failed to update word statistics:', err);
      }

      shouldAdvance = true;
    } catch (err) {
      reportClientError('Failed to record progress:', err);
      if (token === swipeTokenRef.current) {
        setRecordError('Progresso non salvato — riprova');
        shouldAdvance = true;
      }
    }

    if (token === swipeTokenRef.current && shouldAdvance) {
      setCurrentIndex(prev => prev + 1);
      await loadLearningSummary();
    }
    if (token === swipeTokenRef.current) {
      swipeInFlightRef.current = false;
      setSwipeInFlight(false);
    }
  }, [currentIndex, flashcards, loadLearningSummary, copy, language]);

  const clearRecordError = useCallback(() => {
    setRecordError(null);
  }, []);

  const reset = useCallback(async () => {
    try {
      await api.resetProgress();
      setProgress({ cards_reviewed: 0, known_count: 0, unknown_count: 0 });
      setCurrentIndex(0);
      setLearningFeedback(null);
      swipeInFlightRef.current = false;
      setSwipeInFlight(false);
      await loadLearningSummary();
    } catch (err) {
      reportClientError('Failed to reset progress:', err);
    }
  }, [loadLearningSummary]);

  const clearLearningFeedback = useCallback(() => {
    setLearningFeedback(null);
  }, []);

  const clearMilestoneEvent = useCallback(() => {
    setMilestoneEvent(null);
  }, []);

  const currentCard = flashcards[currentIndex];
  const nextCard = flashcards[currentIndex + 1];
  const isComplete = flashcards.length > 0 && currentIndex >= flashcards.length;

  return {
    flashcards,
    currentCard,
    nextCard,
    progress,
    learningSummary,
    learningSummaryLoaded,
    learningFeedback,
    milestoneEvent,
    swipeInFlight,
    loading,
    error,
    recordError,
    isComplete,
    loadFlashcards,
    loadLearningSummary,
    handleSwipe,
    reset,
    clearLearningFeedback,
    clearMilestoneEvent,
    clearRecordError,
  };
};
