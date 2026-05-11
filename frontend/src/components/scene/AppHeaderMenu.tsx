import { useEffect, useRef, useState } from 'react';
import { Code2, MoreVertical } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { FeedbackButton } from '../FeedbackButton';
import { APP_MODE, SHOW_DEVELOPER_TOOLS } from '../../config/appMode';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

interface AppHeaderMenuProps {
  onNavigate: (path: string) => void;
}

export function AppHeaderMenu({ onNavigate }: AppHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="App menu"
        aria-expanded={open}
        className={`inline-flex h-10 w-10 items-center justify-center ${UI_RADIUS.control} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-[75] mt-2 w-60 origin-top-right ${UI_RADIUS.surface} border border-hairline bg-canvas p-2 shadow-sm`}
        >
          <div className="flex items-center gap-2 px-2 py-1.5">
            <FeedbackButton />
            <span className="text-body-sm text-muted">Feedback</span>
          </div>
          {SHOW_DEVELOPER_TOOLS && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigate('/developer');
              }}
              className={`mt-1 flex w-full items-center gap-2 px-2 py-2 text-left text-body-sm font-medium text-ink ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
            >
              <Code2 size={16} />
              Sviluppatore
            </button>
          )}
          <div className="mt-1 border-t border-hairline pt-1">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-body-sm text-muted">Tema</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-body-sm text-muted">Stato</span>
              <span className="text-caption font-medium text-muted">
                {APP_MODE === 'offline' ? 'Offline' : 'Online'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
