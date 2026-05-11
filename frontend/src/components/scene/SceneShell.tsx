import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { SceneHeader } from './SceneHeader';
import { AppHeaderMenu } from './AppHeaderMenu';
import { iconButtonClass } from './sceneClasses';

interface SceneShellProps {
  eyebrow: string;
  title: string;
  subline: string;
  explainerKey?: string;
  explainerTitle?: string;
  explainerBody?: ReactNode;
  back?: { onClick: () => void; label?: string };
  action?: ReactNode;
  onNavigate: (path: string) => void;
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
  onNavigate,
  children,
}: SceneShellProps) {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] px-4 pb-24">
      <div className="sticky top-0 z-[65] -mx-4 flex h-12 items-center justify-between border-b border-hairline bg-canvas/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label ?? 'Indietro'}
              className={iconButtonClass(9)}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="truncate text-body-sm font-medium text-muted">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <AppHeaderMenu onNavigate={onNavigate} />
        </div>
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
