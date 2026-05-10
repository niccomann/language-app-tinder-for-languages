import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

export type GameSignalTone = 'amber' | 'success' | 'error' | 'teal' | 'coral' | 'coral-strong';

interface GameSignalBadgeProps {
  icon: ReactNode;
  label: string;
  tone: GameSignalTone;
  className?: string;
}

// Neutral tones → cream pill; highlight tones → coral/primary.
// `coral-strong` uses primary-active (darker coral) so callers picking
// the strong variant get a visibly heavier accent, not a synonym.
const toneClasses: Record<GameSignalTone, string> = {
  amber:         'border-hairline bg-surface-card text-ink',
  success:       'border-hairline bg-surface-card text-ink',
  teal:          'border-hairline bg-surface-card text-ink',
  error:         'border-primary/30 bg-primary text-on-primary',
  coral:         'border-primary/30 bg-primary text-on-primary',
  'coral-strong':'border-primary-active bg-primary-active text-on-primary',
};

export function GameSignalBadge({
  icon,
  label,
  tone,
  className = '',
}: GameSignalBadgeProps) {
  return (
    <span
      aria-label={label}
      className={`${UI_RADIUS.pill} ${toneClasses[tone]} inline-flex min-h-8 items-center gap-1.5 border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
