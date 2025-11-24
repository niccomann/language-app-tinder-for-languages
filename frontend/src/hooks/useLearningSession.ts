import { useState } from 'react';
import { api } from '../services/api';
import { soraService } from '../services/sora';
import { videoApi } from '../services/video';
import type { Flashcard, UserProgress, SoraVideoGenerationResponse, VideoData } from '../types';

/**
 * Hook to manage learning session state and actions
 */
export const useLearningSession = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<UserProgress>({
    cards_reviewed: 0,
    known_count: 0,
    unknown_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSoraModal, setShowSoraModal] = useState(false);
  const [showReelFeed, setShowReelFeed] = useState(false);
  const [currentWord, setCurrentWord] = useState<{ word: string; translation: string } | null>(null);
  const [youtubeVideo, setYoutubeVideo] = useState<VideoData | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const loadFlashcards = async (selectedCategories: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const cards = await api.getFlashcards({ language: 'de' });
      const filteredCards = cards.filter(
        card => card.category && selectedCategories.includes(card.category)
      );
      setFlashcards(filteredCards);
      setCurrentIndex(0);
    } catch (err) {
      setError('Failed to load flashcards. Make sure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    const known = direction === 'right';

    try {
      const updatedProgress = await api.recordProgress(currentCard.id, known);
      setProgress(updatedProgress);
      
      // If user doesn't know the word (swipe left), open reel feed
      if (!known) {
        setCurrentWord({
          word: currentCard.word,
          translation: currentCard.translation
        });
        
        // Open reel feed with multiple videos
        setShowReelFeed(true);
      } else {
        // If user knows the word, just move to next card
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to record progress:', err);
    }
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setYoutubeVideo(null);
    setCurrentWord(null);
    setCurrentIndex(prev => prev + 1);
  };

  const closeReelFeed = () => {
    setShowReelFeed(false);
    setCurrentWord(null);
    setCurrentIndex(prev => prev + 1);
  };

  const generateSoraVideo = async () => {
    if (!currentCard) return;
    
    setCurrentWord({
      word: currentCard.word,
      translation: currentCard.translation
    });
    
    try {
      const videoResponse: SoraVideoGenerationResponse = await soraService.generateVideo({
        word: currentCard.word,
        translation: currentCard.translation,
        language: currentCard.language,
        category: currentCard.category,
        duration: 5,
        model: 'sora-2'
      });
      
      setVideoJobId(videoResponse.job_id);
      setShowSoraModal(true);
    } catch (videoErr) {
      console.error('Failed to generate Sora video:', videoErr);
    }
  };

  const closeSoraModal = () => {
    setShowSoraModal(false);
    setVideoJobId(null);
  };

  const reset = async () => {
    try {
      await api.resetProgress();
      setProgress({ cards_reviewed: 0, known_count: 0, unknown_count: 0 });
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to reset progress:', err);
    }
  };

  const currentCard = flashcards[currentIndex];
  const nextCard = flashcards[currentIndex + 1];
  const isComplete = currentIndex >= flashcards.length;

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
    videoJobId,
    showVideoModal,
    showSoraModal,
    showReelFeed,
    currentWord,
    closeVideoModal,
    closeSoraModal,
    closeReelFeed,
    youtubeVideo,
    loadingVideo,
    generateSoraVideo,
  };
};
