import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="bg-canvas text-ink border border-hairline rounded-full h-10 w-10 hover:bg-surface-card transition-colors duration-150 inline-flex items-center justify-center"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
