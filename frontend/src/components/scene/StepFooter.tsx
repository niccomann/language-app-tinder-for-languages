import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, UI_INTERACTION, UI_RADIUS } from '../ui';
import { useCopy } from '../../i18n/languageContext';

interface StepFooterProps {
  back?: { label?: string; onClick: () => void };
  primary?: { label: string; onClick: () => void; disabled?: boolean; icon?: ReactNode };
  className?: string;
}

export function StepFooter({ back, primary, className = '' }: StepFooterProps) {
  const copy = useCopy();
  return (
    <footer className={`mt-6 flex items-center justify-between gap-3 ${className}`}>
      {back ? (
        <button
          type="button"
          onClick={back.onClick}
          className={`inline-flex items-center gap-1 px-3 py-2 ${UI_RADIUS.control} text-body-sm font-medium text-muted ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
        >
          <ArrowLeft size={16} /> {back.label ?? copy.common.back}
        </button>
      ) : (
        <span />
      )}
      {primary && (
        <Button variant="primary" onClick={primary.onClick} disabled={primary.disabled}>
          <span className="inline-flex items-center gap-2">
            {primary.label}
            {primary.icon ?? <ArrowRight size={16} />}
          </span>
        </Button>
      )}
    </footer>
  );
}
