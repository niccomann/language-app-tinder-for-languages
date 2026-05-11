import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { reportClientError } from '../utils/clientError';
import type { TargetLanguage } from '../i18n/languageStorage';

/**
 * Reusable hook for TTS audio playback.
 * Can be used anywhere in the app to play word/sentence audio.
 */
export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (text: string, language: TargetLanguage) => {
    if (isPlaying === text || isLoading === text) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(text);
    try {
      const response = await api.speakText(text, language);
      const audio = new Audio(response.audio_base64);
      audioRef.current = audio;
      
      audio.onplay = () => {
        setIsLoading(null);
        setIsPlaying(text);
      };
      audio.onended = () => {
        setIsPlaying(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(null);
        setIsLoading(null);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      reportClientError('Failed to play audio:', error);
      setIsPlaying(null);
      setIsLoading(null);
    }
  }, [isPlaying, isLoading]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(null);
    setIsLoading(null);
  }, []);

  return {
    playAudio,
    stopAudio,
    isPlaying,
    isLoading,
    isPlayingText: (text: string) => isPlaying === text,
    isLoadingText: (text: string) => isLoading === text,
  };
};
