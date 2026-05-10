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
  const titleSize = density === 'compact' ? 'text-display-sm' : 'text-display-md';

  return (
    <header className={`flex items-start justify-between gap-4 ${className}`}>
      <div className={`flex min-w-0 flex-1 items-start gap-3 ${align === 'center' ? 'justify-center text-center' : ''}`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`flex h-10 w-10 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink transition-colors duration-150 hover:bg-surface-card`}
            aria-label="Go back"
          >
            <ArrowLeft size={21} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className={`${titleSize} font-display font-normal leading-tight tracking-[-0.5px] text-ink flex items-center gap-2`}>
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && (
            <p className={`mt-1 max-w-2xl font-sans text-body-md leading-6 text-muted`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
