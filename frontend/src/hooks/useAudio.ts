import { useState, useCallback, useEffect, useRef } from 'react';
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
  const requestTokenRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = useCallback(async (text: string, language: TargetLanguage) => {
    if (isPlaying === text || isLoading === text) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const token = ++requestTokenRef.current;
    setIsLoading(text);
    try {
      const response = await api.speakText(text, language);
      // If a newer playAudio call started, or component unmounted, drop this one.
      if (token !== requestTokenRef.current || !mountedRef.current) return;
      const audio = new Audio(response.audio_base64);
      audioRef.current = audio;

      audio.onplay = () => {
        if (token !== requestTokenRef.current || !mountedRef.current) return;
        setIsLoading(null);
        setIsPlaying(text);
      };
      audio.onended = () => {
        if (token !== requestTokenRef.current || !mountedRef.current) return;
        setIsPlaying(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        if (token !== requestTokenRef.current || !mountedRef.current) return;
        setIsPlaying(null);
        setIsLoading(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      reportClientError('Failed to play audio:', error);
      if (token === requestTokenRef.current && mountedRef.current) {
        setIsPlaying(null);
        setIsLoading(null);
      }
    }
  }, [isPlaying, isLoading]);

  const stopAudio = useCallback(() => {
    requestTokenRef.current++;
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
