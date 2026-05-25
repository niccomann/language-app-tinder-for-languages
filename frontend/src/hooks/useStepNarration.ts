import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

interface StepNarration {
  /** Stop any in-flight playback (e.g. when leaving the intro). */
  stop: () => void;
  /** Manually (re)play the current step's narration — used by a tap-to-hear button. */
  replay: () => void;
  /** True when the browser blocked autoplay and a user gesture is needed. */
  blocked: boolean;
}

const BCP47: Record<string, string> = {
  en: 'en-US',
  it: 'it-IT',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  pt: 'pt-PT',
};

function speakWithBrowser(text: string, language: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BCP47[language] ?? language;
    utterance.onend = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/**
 * Narrates explanation lines with backend OpenAI TTS, falling back to the browser's
 * built-in Web Speech voice when OpenAI is unavailable (e.g. quota exhausted, offline).
 * Prefetches each line, plays the active step as it appears, and unlocks autoplay on
 * the first user gesture.
 */
export function useStepNarration(
  steps: string[],
  language: string,
  activeStep: number,
  enabled: boolean,
  onEnded?: (index: number) => void,
): StepNarration {
  const [audios, setAudios] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [blocked, setBlocked] = useState(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const playedIdxRef = useRef<number | null>(null);
  const unlockedRef = useRef(false);
  const stateRef = useRef({ audios, failed, activeStep, steps, language, onEnded });
  const stepsKey = steps.join('');

  useEffect(() => {
    stateRef.current = { audios, failed, activeStep, steps, language, onEnded };
  });

  const stop = useCallback(() => {
    audioElRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const playStep = useCallback((idx: number) => {
    const { audios: a, failed: f, steps: s, language: lang, onEnded: ended } = stateRef.current;
    audioElRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();

    const b64 = a[idx];
    if (b64) {
      playedIdxRef.current = idx; // optimistic: blocks duplicate auto-attempts
      const el = new Audio(b64);
      audioElRef.current = el;
      el.onended = () => ended?.(idx); // drive auto-advance to the next step
      const played = el.play();
      if (played && typeof played.then === 'function') {
        played
          .then(() => {
            unlockedRef.current = true;
            setBlocked((b) => (b ? false : b));
          })
          .catch(() => {
            playedIdxRef.current = null; // allow retry on user gesture
            setBlocked((b) => (b ? b : true));
          });
      } else {
        unlockedRef.current = true;
      }
      return;
    }

    if (f[idx]) {
      // OpenAI generation genuinely failed -> browser voice fallback (also advances on end).
      playedIdxRef.current = idx;
      if (speakWithBrowser(s[idx] ?? '', lang, () => ended?.(idx))) {
        unlockedRef.current = true;
      }
      return;
    }

    // Audio is still being prefetched. Do NOT fall back to the robotic browser
    // voice — leave playedIdxRef clear so the ready-effect plays the OpenAI audio
    // the moment it arrives (the page is already activated by the user gesture,
    // so the deferred play() is allowed). Falling back here was the bug that made
    // intros speak in the robotic browser voice whenever a tap beat the prefetch.
    playedIdxRef.current = null;
  }, []);

  const replay = useCallback(() => {
    playedIdxRef.current = null;
    playStep(stateRef.current.activeStep);
  }, [playStep]);

  // Prefetch every step's narration; mark failures so we can fall back.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    steps.forEach((line, i) => {
      api
        .speakNarration(line, language)
        .then((r) => {
          if (!cancelled) setAudios((prev) => (prev[i] ? prev : { ...prev, [i]: r.audio_base64 }));
        })
        .catch(() => {
          if (!cancelled) setFailed((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsKey, language, enabled]);

  // Play the active step once its audio is ready (or known-failed -> fallback).
  useEffect(() => {
    if (!enabled) return;
    const ready = Boolean(audios[activeStep]) || failed[activeStep];
    if (!ready || playedIdxRef.current === activeStep) return;
    playStep(activeStep);
  }, [enabled, activeStep, audios, failed, playStep]);

  // Autoplay is blocked until a user gesture. Any interaction (anywhere, not just
  // the speaker button) force-plays the current step; once playback has started we
  // ignore further gestures. This survives the race where an in-flight blocked
  // play() would otherwise waste a one-shot listener.
  useEffect(() => {
    if (!enabled) return;
    const onGesture = () => {
      if (unlockedRef.current) return;
      playedIdxRef.current = null;
      playStep(stateRef.current.activeStep);
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [enabled, playStep]);

  // Stop playback on unmount.
  useEffect(
    () => () => {
      audioElRef.current?.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { stop, replay, blocked };
}
