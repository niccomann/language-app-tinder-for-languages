import type { ReactNode } from 'react';
import { UI_INTERACTION } from './geometry';

export type PillTabTone = 'coral' | 'teal' | 'teal-soft' | 'amber' | 'success';

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

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={`flex min-h-10 min-w-fit items-center gap-2 px-3.5 py-2 rounded-md text-nav-link font-medium ${UI_INTERACTION.fastTransition} ${
              active
                ? 'bg-surface-card text-ink'
                : 'bg-transparent text-muted hover:bg-surface-card hover:text-ink'
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
