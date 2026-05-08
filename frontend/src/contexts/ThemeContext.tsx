import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type Theme } from './theme-context';
import { readStorageValue, writeStorageValue } from '../utils/browserStorage';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = readStorageValue('theme') as Theme;
    return savedTheme || 'light';
  });

  useEffect(() => {
    writeStorageValue('theme', theme);
    
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
