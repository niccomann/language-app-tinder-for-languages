import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { ExplainerSheet } from './ExplainerSheet';
import { isExplainerDismissed } from './explainerStorage';
import { useCopy } from '../../i18n/languageContext';

interface SceneHeaderProps {
  eyebrow: string;
  title: string;
  subline: string;
  explainerKey?: string;
  explainerTitle?: string;
  explainerBody?: ReactNode;
  className?: string;
}

export function SceneHeader({
  eyebrow,
  title,
  subline,
  explainerKey,
  explainerTitle,
  explainerBody,
  className = '',
}: SceneHeaderProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const effectiveKey = explainerKey ?? `scene:${title}`;
  const dismissed = isExplainerDismissed(effectiveKey);
  const hasContent = Boolean(subline || explainerBody);

  return (
    <header className={`flex flex-col gap-2 ${className}`}>
      <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
        {eyebrow}
      </p>
      <div className="flex items-start gap-2">
        <h1 className="flex-1 font-display text-display-sm font-normal leading-tight tracking-[-0.3px] text-ink">
          {title}
        </h1>
        {hasContent && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-1 ${UI_RADIUS.control} border border-hairline bg-canvas text-caption font-medium ${
              dismissed ? 'text-muted-soft' : 'text-muted'
            } ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
            aria-label={copy.common.whatIsAria}
          >
            <Info size={14} />
            {copy.common.whatIs}
          </button>
        )}
      </div>
      {hasContent && (
        <ExplainerSheet
          open={open}
          onClose={() => setOpen(false)}
          storageKey={effectiveKey}
          title={explainerTitle ?? title}
        >
          {subline && <p>{subline}</p>}
          {explainerBody}
        </ExplainerSheet>
      )}
    </header>
  );
}
