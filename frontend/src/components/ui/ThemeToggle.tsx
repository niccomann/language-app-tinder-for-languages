import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { UI_ELEVATION, UI_INTERACTION, UI_RADIUS } from './geometry';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-4 py-2.5 ${UI_RADIUS.pill} font-medium ${UI_INTERACTION.transition} ${UI_INTERACTION.iconLift} ${UI_INTERACTION.press} ${UI_ELEVATION.floating} ${
        isDark
          ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
          : 'bg-slate-800 text-white hover:bg-slate-700'
      }`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="text-sm">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
