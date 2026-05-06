import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  align?: 'left' | 'center';
  density?: 'compact' | 'regular';
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  icon,
  onBack,
  actions,
  align = 'left',
  density = 'regular',
  className = '',
}: ScreenHeaderProps) {
  const titleSize = density === 'compact' ? 'text-2xl' : 'text-3xl md:text-4xl';
  const subtitleSize = density === 'compact' ? 'text-sm' : 'text-sm md:text-base';

  return (
    <header className={`flex items-start justify-between gap-4 ${className}`}>
      <div className={`flex min-w-0 flex-1 items-start gap-3 ${align === 'center' ? 'justify-center text-center' : ''}`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`flex h-11 w-11 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700`}
            aria-label="Go back"
          >
            <ArrowLeft size={21} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className={`${titleSize} flex items-center gap-2 font-extrabold leading-tight text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text`}>
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && (
            <p className={`mt-1 max-w-2xl font-semibold leading-6 text-slate-600 dark:text-slate-300 ${subtitleSize}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
