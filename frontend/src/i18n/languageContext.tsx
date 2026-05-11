import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  clearStoredLanguage,
  readStoredSource,
  readStoredTarget,
  writeStoredSource,
  writeStoredTarget,
  type SourceLocale,
  type TargetLanguage,
} from './languageStorage';
import { getStaticCopy, type StaticCopy } from './staticCopy';

interface LanguageContextValue {
  targetLanguage: TargetLanguage | null;
  sourceLocale: SourceLocale | null;
  setTarget: (value: TargetLanguage) => void;
  setSource: (value: SourceLocale) => void;
  reset: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [targetLanguage, setTargetState] = useState<TargetLanguage | null>(() => {
    const t = readStoredTarget();
    const s = readStoredSource();
    // Treat source == target as a corrupted state (only reachable via dev-tools tampering).
    if (t && s && (t as string) === (s as string)) {
      clearStoredLanguage();
      return null;
    }
    return t;
  });
  const [sourceLocale, setSourceState] = useState<SourceLocale | null>(() => {
    const t = readStoredTarget();
    const s = readStoredSource();
    if (t && s && (t as string) === (s as string)) return null;
    return s;
  });

  const setTarget = useCallback((value: TargetLanguage) => {
    writeStoredTarget(value);
    setTargetState(value);
    // Reload propaga il nuovo target a ogni consumer senza refactor capillare immediato.
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  const setSource = useCallback((value: SourceLocale) => {
    writeStoredSource(value);
    setSourceState(value);
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  const reset = useCallback(() => {
    clearStoredLanguage();
    setTargetState(null);
    setSourceState(null);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ targetLanguage, sourceLocale, setTarget, setSource, reset }),
    [targetLanguage, sourceLocale, setTarget, setSource, reset],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

export function useTargetLanguage(): TargetLanguage {
  const { targetLanguage } = useLanguage();
  if (!targetLanguage) {
    throw new Error('useTargetLanguage called before onboarding completed');
  }
  return targetLanguage;
}

export function useCopy(): StaticCopy {
  const { sourceLocale } = useLanguage();
  // Fallback a 'en' se mancante (caso di pre-onboarding rendering).
  return getStaticCopy(sourceLocale ?? 'en');
}
