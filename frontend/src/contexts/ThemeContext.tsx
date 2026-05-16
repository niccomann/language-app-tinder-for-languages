import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type Theme } from './theme-context';
import { readStorageValue, writeStorageValue } from '../utils/browserStorage';

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'languageApp:theme:v1';
const LEGACY_THEME_KEY = 'theme';

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readStorageValue(THEME_STORAGE_KEY) as Theme | null;
    if (saved) return saved;
    // One-time migration from the unprefixed legacy key.
    const legacy = readStorageValue(LEGACY_THEME_KEY) as Theme | null;
    return legacy || 'light';
  });

  useEffect(() => {
    writeStorageValue(THEME_STORAGE_KEY, theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(previousTheme => previousTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
