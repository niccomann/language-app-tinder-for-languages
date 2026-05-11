import { UI_INTERACTION, UI_RADIUS } from '../ui';

export interface SubNavItem {
  id: string;
  label: string;
  onClick: () => void;
  active: boolean;
}

interface SubNavProps {
  items: SubNavItem[];
  ariaLabel: string;
}

export function SubNav({ items, ariaLabel }: SubNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-12 z-[63] -mx-4 mt-3 overflow-x-auto border-b border-hairline bg-canvas/95 backdrop-blur-sm"
    >
      <ul className="flex min-w-max items-center gap-1 px-4 py-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`whitespace-nowrap px-3 py-1.5 text-body-sm font-medium ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${
                item.active ? 'bg-ink text-canvas' : 'text-muted hover:bg-surface-card hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
