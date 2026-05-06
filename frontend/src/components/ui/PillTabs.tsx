import type { ReactNode } from 'react';
import { UI_ELEVATION, UI_INTERACTION, UI_RADIUS } from './geometry';

export type PillTabTone = 'indigo' | 'blue' | 'cyan' | 'orange' | 'pink' | 'emerald' | 'amber';

export interface PillTabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  tone?: PillTabTone;
}

interface PillTabsProps<T extends string> {
  items: Array<PillTabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

const activeToneClasses: Record<PillTabTone, string> = {
  indigo: 'from-indigo-600 to-purple-600',
  blue: 'from-blue-600 to-purple-600',
  cyan: 'from-cyan-500 to-purple-500',
  orange: 'from-orange-500 to-pink-500',
  pink: 'from-pink-500 to-red-500',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
};

export function PillTabs<T extends string>({
  items,
  value,
  onChange,
  className = '',
  ariaLabel = 'View tabs',
}: PillTabsProps<T>) {
  return (
    <nav aria-label={ariaLabel} className={`flex flex-wrap justify-center gap-2 ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        const tone = item.tone ?? 'indigo';

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={`flex min-h-11 min-w-fit items-center gap-2 ${UI_RADIUS.pill} px-5 py-2.5 text-sm font-bold ${UI_INTERACTION.fastTransition} ${UI_INTERACTION.press} ${
              active
                ? `bg-gradient-to-r ${activeToneClasses[tone]} text-white ${UI_ELEVATION.floating}`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
