import { BookOpen, Compass, Home, Sparkles } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { useCopy } from '../../i18n/languageContext';

type SectionId = 'path' | 'learn' | 'review' | 'explore';

interface BottomNavItem {
  id: SectionId;
  path: string;
  icon: typeof Home;
}

const ITEMS: readonly BottomNavItem[] = [
  { id: 'path', path: '/', icon: Home },
  { id: 'learn', path: '/learn', icon: BookOpen },
  { id: 'review', path: '/review', icon: Sparkles },
  { id: 'explore', path: '/grammar', icon: Compass },
];

function matchSection(pathname: string): SectionId {
  if (pathname === '/' || pathname.startsWith('/path')) return 'path';
  if (pathname.startsWith('/learn')) return 'learn';
  if (
    pathname.startsWith('/review') ||
    pathname.startsWith('/vocabulary') ||
    pathname.startsWith('/word-match') ||
    pathname.startsWith('/sentence-practice') ||
    pathname.startsWith('/library')
  ) {
    return 'review';
  }
  if (
    pathname.startsWith('/explore') ||
    pathname.startsWith('/grammar') ||
    pathname.startsWith('/placement')
  ) {
    return 'explore';
  }
  return 'path';
}

interface BottomNavProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function BottomNav({ pathname, onNavigate }: BottomNavProps) {
  const active = matchSection(pathname);
  const copy = useCopy();
  return (
    <nav
      aria-label={copy.a11y.productNav}
      className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[480px] border-t border-hairline bg-canvas px-2 py-1.5"
    >
      <ul className="grid grid-cols-4 gap-1">
        {ITEMS.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-medium leading-none ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${
                  isActive
                    ? 'bg-ink text-canvas'
                    : 'text-muted hover:bg-surface-card hover:text-ink'
                }`}
              >
                <Icon size={18} />
                <span>{copy.bottomNav[item.id]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
