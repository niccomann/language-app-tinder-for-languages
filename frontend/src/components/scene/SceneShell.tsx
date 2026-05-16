import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { SceneHeader } from './SceneHeader';
import { iconButtonClass } from './sceneClasses';
import { useCopy } from '../../i18n/languageContext';

interface SceneShellProps {
  eyebrow: string;
  title: string;
  subline: string;
  explainerKey?: string;
  explainerTitle?: string;
  explainerBody?: ReactNode;
  back?: { onClick: () => void; label?: string };
  action?: ReactNode;
  // Kept for backward compatibility with existing callers; no longer used
  // here because AppChrome (App.tsx) already renders the kebab menu globally.
  onNavigate?: (path: string) => void;
  children: ReactNode;
}

export function SceneShell({
  eyebrow,
  title,
  subline,
  explainerKey,
  explainerTitle,
  explainerBody,
  back,
  action,
  children,
}: SceneShellProps) {
  const copy = useCopy();
  // Reserve right padding for AppChrome (avatar + language switcher + menu)
  // fixed in the top-right on mobile.
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] px-4 pb-28 md:pb-12">
      <div className="sticky top-0 z-[65] -mx-4 flex h-12 items-center justify-between gap-2 border-b border-hairline bg-canvas/95 px-4 pr-40 backdrop-blur-sm sm:pr-4">
        <div className="flex min-w-0 items-center gap-2">
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label ?? copy.common.back}
              className={iconButtonClass(9)}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="truncate text-body-sm font-medium text-muted">{title}</span>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      <SceneHeader
        eyebrow={eyebrow}
        title={title}
        subline={subline}
        explainerKey={explainerKey}
        explainerTitle={explainerTitle}
        explainerBody={explainerBody}
        className="mt-5"
      />
      <main className="mt-5">{children}</main>
    </div>
  );
}
