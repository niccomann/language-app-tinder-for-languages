import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

interface WordStats {
  word: string;
  language: string;
  confidence_score: number;
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  last_practiced: string | null;
}

interface StatsSummary {
  total_words_practiced: number;
  average_confidence: number;
  words_mastered: number;
  words_learning: number;
  words_struggling: number;
  total_practice_sessions: number;
}

/**
 * Reusable hook for word statistics.
 * Can be used anywhere in the app to show/update word confidence.
 */
export const useWordStats = (language: string = 'de') => {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [wordStats, setWordStats] = useState<Map<string, WordStats>>(new Map());
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const data = await api.getStatisticsSummary(language);
      setSummary(data);
    } catch (error) {
      console.error('Failed to load statistics summary:', error);
    }
  }, [language]);

  const getWordStats = useCallback(async (word: string): Promise<WordStats | null> => {
    const cached = wordStats.get(word);
    if (cached) return cached;

    try {
      const stats = await api.getWordStatistics(word, language);
      setWordStats(prev => new Map(prev).set(word, stats));
      return stats;
    } catch (error) {
      console.error(`Failed to get stats for ${word}:`, error);
      return null;
    }
  }, [language, wordStats]);

  const updateStats = useCallback(async (word: string, correct: boolean) => {
    try {
      const result = await api.updateWordStatistics(word, correct, language);
      const updatedStats: WordStats = {
        word: result.word,
        language,
        confidence_score: result.new_confidence_score,
        times_seen: result.times_seen,
        times_correct: result.times_correct,
        times_incorrect: result.times_incorrect,
        last_practiced: new Date().toISOString(),
      };
      setWordStats(prev => new Map(prev).set(word, updatedStats));
      loadSummary();
      return updatedStats;
    } catch (error) {
      console.error(`Failed to update stats for ${word}:`, error);
      return null;
    }
  }, [language, loadSummary]);

  const getConfidenceColor = useCallback((score: number): string => {
    if (score >= 10) return 'text-green-600 bg-green-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    if (score >= 1) return 'text-orange-600 bg-orange-100';
    return 'text-gray-400 bg-gray-100';
  }, []);

  const getConfidenceLabel = useCallback((score: number): string => {
    if (score >= 10) return 'Mastered';
    if (score >= 5) return 'Learning';
    if (score >= 1) return 'Practicing';
    return 'New';
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    summary,
    wordStats,
    loading,
    loadSummary,
    getWordStats,
    updateStats,
    getConfidenceColor,
    getConfidenceLabel,
  };
};
