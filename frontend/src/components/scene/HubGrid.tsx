import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

export interface HubGridItem {
  id: string;
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  trailing?: ReactNode;
}

interface HubGridProps {
  items: HubGridItem[];
  className?: string;
}

export function HubGrid({ items, className = '' }: HubGridProps) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={item.onClick}
            className={`flex w-full min-h-[88px] items-center gap-3 ${UI_RADIUS.surface} border border-hairline bg-canvas px-4 py-3 text-left ${UI_INTERACTION.transition} hover:bg-surface-card`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center ${UI_RADIUS.control} bg-surface-cream-strong text-ink`}
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-body-lg font-normal leading-tight text-ink">
                {item.title}
              </span>
              <span className="mt-0.5 block text-body-sm text-muted">{item.sub}</span>
            </span>
            {item.trailing ?? <ChevronRight size={18} className="text-muted-soft" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
