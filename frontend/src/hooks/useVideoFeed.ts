import { useState, useCallback, useEffect } from 'react';
import type { VideoData } from '../types';

interface UseVideoFeedProps {
  word: string;
  translation: string;
  language: string;
}

interface UseVideoFeedReturn {
  videos: VideoData[];
  currentIndex: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  goToNext: () => void;
  goToPrevious: () => void;
  loadVideos: () => Promise<void>;
  reset: () => void;
}

export function useVideoFeed({ word, translation, language }: UseVideoFeedProps): UseVideoFeedReturn {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    if (!word || !translation) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/videos/search-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, translation, language, limit: 8 }),
      });

      if (!response.ok) {
        throw new Error('Failed to load videos');
      }

      const data = await response.json();
      setVideos(data.videos || []);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  }, [word, translation, language]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, videos.length - 1));
  }, [videos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setVideos([]);
    setCurrentIndex(0);
    setError(null);
    setLoading(false);
  }, []);

  const hasMore = currentIndex < videos.length - 1;

  return {
    videos,
    currentIndex,
    loading,
    error,
    hasMore,
    goToNext,
    goToPrevious,
    loadVideos,
    reset,
  };
}
