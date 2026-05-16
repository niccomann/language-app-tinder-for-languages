import type { ReactNode } from 'react';
import { UI_INTERACTION } from './geometry';

export type PillTabTone = 'coral' | 'teal' | 'teal-soft' | 'amber' | 'success';

export interface PillTabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  // Reserved for future per-tab accent treatment. PillTabs currently
  // renders all tabs with the same cream/active pair; the `tone` is
  // kept on the item shape so callers don't need to refactor when we
  // wire up accents later.
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
  // Mobile: horizontal scroll on a single row so the tab bar never grows
  // tall enough to cover the underlying view (e.g. the Hierarchy sunburst).
  // Right edge fades out so the user notices there is more to scroll.
  // Desktop: wrap as before — there is room and centered wrap reads better.
  return (
    <nav
      aria-label={ariaLabel}
      className={`flex flex-nowrap items-center gap-2 overflow-x-auto pr-2 sm:flex-wrap sm:justify-center sm:overflow-x-visible sm:pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,black_calc(100%-20px),transparent)] sm:[mask-image:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
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
