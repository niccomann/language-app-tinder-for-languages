import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, UI_INTERACTION, UI_RADIUS } from '../ui';
import { markExplainerDismissed } from './explainerStorage';

interface ExplainerSheetProps {
  open: boolean;
  onClose: () => void;
  storageKey: string;
  title: string;
  children: ReactNode;
}

export function ExplainerSheet({ open, onClose, storageKey, title, children }: ExplainerSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const dismissForever = () => {
    markExplainerDismissed(storageKey);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative mx-auto w-full max-w-[480px] ${UI_RADIUS.surface} max-h-[85vh] overflow-y-auto border border-hairline bg-canvas p-5 pb-6 sm:my-6`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center ${UI_RADIUS.control} text-muted ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
        >
          <X size={18} />
        </button>
        <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
          Cos'è?
        </p>
        <h3 className="mt-2 font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
          {title}
        </h3>
        <div className="mt-3 space-y-3 text-body-md text-body-strong">{children}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismissForever}
            className="text-body-sm font-medium text-muted underline-offset-2 hover:underline"
          >
            Non mostrare più
          </button>
          <Button variant="primary" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  );
}
