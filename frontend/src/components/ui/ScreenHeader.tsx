import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';
import { useCopy } from '../../i18n/languageContext';

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
  const copy = useCopy();
  // Mobile always renders a smaller title so it fits next to AppChrome
  // without truncation, even on screens that pass density="regular".
  const titleSize =
    density === 'compact'
      ? 'text-display-sm'
      : 'text-display-sm sm:text-display-md';

  // Reserve room for AppChrome (avatar + language switcher + kebab menu)
  // fixed in the top-right; otherwise titles render under it on narrow
  // viewports.
  // Title row reserves room for the fixed AppChrome on the right (avatar +
  // language switcher + kebab menu, ~150px wide on mobile). The subtitle
  // does NOT inherit that padding, so it can use the full width.
  return (
    <header className={className}>
      <div className="flex items-start justify-between gap-4 pr-40 sm:pr-0">
        <div className={`flex min-w-0 flex-1 items-start gap-3 ${align === 'center' ? 'justify-center text-center' : ''}`}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`flex h-10 w-10 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink transition-colors duration-150 hover:bg-surface-card`}
              aria-label={copy.a11y.goBack}
            >
              <ArrowLeft size={21} />
            </button>
          )}
          <div className="min-w-0">
            {title && (
              <h1 className={`${titleSize} font-display font-normal leading-tight tracking-[-0.5px] text-ink flex items-center gap-2`}>
                {icon && <span className="hidden sm:inline-flex">{icon}</span>}
                <span className="truncate">{title}</span>
              </h1>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {subtitle && (
        <p className="mt-1 max-w-2xl font-sans text-body-md leading-6 text-muted">
          {subtitle}
        </p>
      )}
    </header>
  );
}
