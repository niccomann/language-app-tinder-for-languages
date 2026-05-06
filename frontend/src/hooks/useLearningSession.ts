import { useCallback, useState } from 'react';
import { api } from '../services/api';
import type { AdaptiveFlashcard, UserProgress } from '../types';

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

  const loadFlashcards = useCallback(async (selectedCategories: string[]) => {
    try {
      setLoading(true);
      setError(null);
      if (selectedCategories.length === 0) {
        setFlashcards([]);
        setCurrentIndex(0);
        return;
      }

      const cards = await api.getAdaptiveFlashcards({
        language: 'de',
        selectedCategories,
        limit: 200,
      });
      setFlashcards(cards);
      setCurrentIndex(0);
    } catch (err) {
      setError('Failed to load flashcards. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    const known = direction === 'right';

    try {
      const updatedProgress = await api.recordProgress(currentCard.id, known);
      setProgress(updatedProgress);
      
      try {
        await api.updateWordStatistics(currentCard.word, known, currentCard.language);
      } catch (err) {
        console.error('Failed to update word statistics:', err);
      }
      
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error('Failed to record progress:', err);
    }
  }, [currentIndex, flashcards]);

  const reset = useCallback(async () => {
    try {
      await api.resetProgress();
      setProgress({ cards_reviewed: 0, known_count: 0, unknown_count: 0 });
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to reset progress:', err);
    }
  }, []);

  const currentCard = flashcards[currentIndex];
  const nextCard = flashcards[currentIndex + 1];
  const isComplete = flashcards.length > 0 && currentIndex >= flashcards.length;

  return {
    flashcards,
    currentCard,
    nextCard,
    progress,
    loading,
    error,
    isComplete,
    loadFlashcards,
    handleSwipe,
    reset,
  };
};
