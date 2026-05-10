import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'de' | 'fr';

const STORAGE_KEY = 'app.language';
const DEFAULT_LANGUAGE: Language = 'de';

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({ language: DEFAULT_LANGUAGE, setLanguage: () => {} });

function readStored(): Language {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'de' || v === 'fr') return v;
  } catch {
    // ignore
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
