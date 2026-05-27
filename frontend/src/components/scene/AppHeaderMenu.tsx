import { useEffect, useRef, useState } from 'react';
import { Code2, FileUp, LogOut, MessageSquarePlus, MoreVertical } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { FeedbackButton } from '../FeedbackButton';
import { GoogleLoginButton } from '../GoogleLoginButton';
import { APP_MODE, GOOGLE_CLIENT_ID, SHOW_DEVELOPER_TOOLS } from '../../config/appMode';
import { clearAuthSession, readAuthSession } from '../../services/authSession';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { useCopy } from '../../i18n/languageContext';

const MENU_ITEM_CLASS = `flex w-full items-center gap-2 px-2 py-2 text-left text-body-sm font-medium text-ink ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} hover:bg-surface-card`;

interface AppHeaderMenuProps {
  onNavigate: (path: string) => void;
}

export function AppHeaderMenu({ onNavigate }: AppHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const copy = useCopy();
  const session = readAuthSession();

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
        aria-label={copy.a11y.appMenu}
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
          <FeedbackButton
            triggerClassName={MENU_ITEM_CLASS}
            triggerIcon={<MessageSquarePlus size={16} />}
            triggerLabel="Feedback"
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNavigate('/import-words');
            }}
            className={`mt-1 ${MENU_ITEM_CLASS}`}
          >
            <FileUp size={16} />
            {copy.importKnown.menuLabel}
          </button>
          {SHOW_DEVELOPER_TOOLS && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigate('/developer');
              }}
              className={`mt-1 ${MENU_ITEM_CLASS}`}
            >
              <Code2 size={16} />
              Sviluppatore
            </button>
          )}
          {(session || GOOGLE_CLIENT_ID) && (
            <div className="mt-1 border-t border-hairline pt-1">
              {session ? (
                <>
                  <p className="truncate px-2 pt-1 text-caption text-muted">{session.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      clearAuthSession();
                      window.location.reload();
                    }}
                    className={`mt-1 ${MENU_ITEM_CLASS}`}
                  >
                    <LogOut size={16} />
                    Esci
                  </button>
                </>
              ) : (
                <GoogleLoginButton />
              )}
            </div>
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
