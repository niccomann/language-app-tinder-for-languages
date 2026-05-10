import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

export type GameSignalTone = 'amber' | 'emerald' | 'rose' | 'sky' | 'indigo' | 'purple';

interface GameSignalBadgeProps {
  icon: ReactNode;
  label: string;
  tone: GameSignalTone;
  className?: string;
}

// Neutral tones → cream pill; highlight tones → coral/primary
const toneClasses: Record<GameSignalTone, string> = {
  amber:   'border-hairline bg-surface-card text-ink',
  emerald: 'border-hairline bg-surface-card text-ink',
  sky:     'border-hairline bg-surface-card text-ink',
  rose:    'border-primary/30 bg-primary text-on-primary',
  indigo:  'border-primary/30 bg-primary text-on-primary',
  purple:  'border-primary/30 bg-primary text-on-primary',
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
