import { useCallback, useState } from 'react';
import { api } from '../services/api';
import type { AdaptiveFlashcard, AdaptiveLearningSummary, LearningFeedback, UserProgress } from '../types';
import { reportClientError } from '../utils/clientError';

const SESSION_CARD_LIMIT = 80;

/**
 * Hook to manage learning session state and actions
 */
export const useLearningSession = () => {
  const [flashcards, setFlashcards] = useState<AdaptiveFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<UserProgress>({
    cards_reviewed: 0,
    known_count: 0,
    unknown_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learningSummary, setLearningSummary] = useState<AdaptiveLearningSummary | null>(null);
  const [learningFeedback, setLearningFeedback] = useState<LearningFeedback | null>(null);

  const loadLearningSummary = useCallback(async () => {
    const summary = await api.getAdaptiveLearningSummary('de');
    setLearningSummary(summary);
    return summary;
  }, []);

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

      const [cards] = await Promise.all([
        api.getAdaptiveFlashcards({
          language: 'de',
          selectedCategories,
          limit: SESSION_CARD_LIMIT,
        }),
        loadLearningSummary(),
      ]);
      setFlashcards(cards);
      setCurrentIndex(0);
      setLearningFeedback(null);
    } catch (err) {
      setError('Failed to load flashcards. Make sure the backend is running.');
      reportClientError('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  }, [loadLearningSummary]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    const known = direction === 'right';

    try {
      const updatedProgress = await api.recordProgress(currentCard.id, known);
      setProgress(updatedProgress);
      
      try {
        const updatedStatistics = await api.updateWordStatistics(currentCard.word, known, currentCard.language);
        if (updatedStatistics.knowledge_level > currentCard.knowledge_level) {
          setLearningFeedback({
            title: `${currentCard.word} reached Mastery ${updatedStatistics.knowledge_level}`,
            message: 'Your German path just moved forward.',
            tone: 'level_up',
          });
        } else if (updatedProgress.cards_reviewed > 0 && updatedProgress.cards_reviewed % 5 === 0) {
          setLearningFeedback({
            title: 'Learning signal updated',
            message: 'The app is recalibrating your next cards from what you knew and missed.',
            tone: 'progress',
          });
        }
        await loadLearningSummary();
      } catch (err) {
        reportClientError('Failed to update word statistics:', err);
      }
      
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      reportClientError('Failed to record progress:', err);
    }
  }, [currentIndex, flashcards, loadLearningSummary]);

  const reset = useCallback(async () => {
    try {
      await api.resetProgress();
      setProgress({ cards_reviewed: 0, known_count: 0, unknown_count: 0 });
      setCurrentIndex(0);
      setLearningFeedback(null);
      await loadLearningSummary();
    } catch (err) {
      reportClientError('Failed to reset progress:', err);
    }
  }, [loadLearningSummary]);

  const clearLearningFeedback = useCallback(() => {
    setLearningFeedback(null);
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
    learningFeedback,
    loading,
    error,
    isComplete,
    loadFlashcards,
    loadLearningSummary,
    handleSwipe,
    reset,
    clearLearningFeedback,
  };
};
