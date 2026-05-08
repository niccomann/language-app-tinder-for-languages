import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

export type GameSignalTone = 'amber' | 'emerald' | 'rose' | 'sky' | 'indigo' | 'purple';

interface GameSignalBadgeProps {
  icon: ReactNode;
  label: string;
  tone: GameSignalTone;
  className?: string;
}

const toneClasses: Record<GameSignalTone, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
  rose: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100',
  sky: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100',
  purple: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-100',
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
      className={`${UI_RADIUS.pill} ${toneClasses[tone]} inline-flex min-h-8 items-center gap-1.5 border px-3 py-1 text-xs font-black uppercase tracking-wide shadow-sm ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
