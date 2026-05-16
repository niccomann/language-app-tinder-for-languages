import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { useCopy } from '../../i18n/languageContext';

interface WizardShellProps {
  stepIndex: number;
  stepCount: number;
  eyebrow?: string;
  title: string;
  subline?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function WizardShell({
  stepIndex,
  stepCount,
  eyebrow,
  title,
  subline,
  onBack,
  children,
  footer,
}: WizardShellProps) {
  const copy = useCopy();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-canvas px-4 pb-6">
      <header className="flex items-center gap-3 pt-5">
        <div className="w-10">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={copy.common.back}
              className={`inline-flex h-10 w-10 items-center justify-center ${UI_RADIUS.control} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
            >
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full ${UI_INTERACTION.fastTransition} ${
                i === stepIndex
                  ? 'w-6 bg-primary'
                  : i < stepIndex
                    ? 'w-1.5 bg-primary/60'
                    : 'w-1.5 bg-surface-card'
              }`}
              aria-hidden
            />
          ))}
        </div>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col justify-center pb-6 pt-8">
        {eyebrow && (
          <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
            {eyebrow}
          </p>
        )}
        {title && (
          <h1 className="mt-2 font-display text-display-sm font-normal leading-tight tracking-[-0.3px] text-ink">
            {title}
          </h1>
        )}
        {subline && <p className="mt-2 text-body-sm text-muted">{subline}</p>}
        <div className="mt-7">{children}</div>
      </main>

      {footer && <footer className="pb-2">{footer}</footer>}
    </div>
  );
}
