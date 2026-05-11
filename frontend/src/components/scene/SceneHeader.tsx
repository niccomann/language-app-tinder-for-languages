import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { ExplainerSheet } from './ExplainerSheet';
import { isExplainerDismissed } from './explainerStorage';

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
  const [open, setOpen] = useState(false);
  const dismissed = explainerKey ? isExplainerDismissed(explainerKey) : false;
  const showChip = Boolean(explainerKey && explainerBody);

  return (
    <header className={`flex flex-col gap-2 ${className}`}>
      <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
        {eyebrow}
      </p>
      <div className="flex items-start gap-2">
        <h1 className="flex-1 font-display text-display-sm font-normal leading-tight tracking-[-0.3px] text-ink">
          {title}
        </h1>
        {showChip && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 ${UI_RADIUS.control} border border-hairline bg-canvas text-caption font-medium ${
              dismissed ? 'text-muted-soft' : 'text-muted'
            } ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
            aria-label="Cos'è questa schermata?"
          >
            <Info size={14} />
            Cos'è?
          </button>
        )}
      </div>
      <p className="text-body-md text-muted">{subline}</p>
      {showChip && explainerKey && (
        <ExplainerSheet
          open={open}
          onClose={() => setOpen(false)}
          storageKey={explainerKey}
          title={explainerTitle ?? title}
        >
          {explainerBody}
        </ExplainerSheet>
      )}
    </header>
  );
}
