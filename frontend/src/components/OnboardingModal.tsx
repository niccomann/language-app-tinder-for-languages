import { useState } from 'react';
import { useLanguage } from '../i18n/languageContext';
import type { SourceLocale, TargetLanguage } from '../i18n/languageStorage';
import { Button, UI_INTERACTION, UI_RADIUS } from './ui';

const TARGET_OPTIONS: Array<{ code: TargetLanguage; flag: string; label: string }> = [
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const SOURCE_OPTIONS: Array<{ code: SourceLocale; flag: string; label: string }> = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

interface OnboardingModalProps {
  initialTarget?: TargetLanguage | null;
  initialSource?: SourceLocale | null;
  onClose?: () => void;
}

export function OnboardingModal({ initialTarget, initialSource, onClose }: OnboardingModalProps) {
  const { setTarget, setSource } = useLanguage();
  const [target, setTargetLocal] = useState<TargetLanguage | null>(initialTarget ?? null);
  const [source, setSourceLocal] = useState<SourceLocale | null>(initialSource ?? null);

  const sourceConflict = (code: SourceLocale) => target !== null && (code as string) === (target as string);
  const canSubmit = target !== null && source !== null && !sourceConflict(source);

  const handleSubmit = () => {
    if (!canSubmit || !target || !source) return;
    setSource(source);
    setTarget(target);
    onClose?.();
  };

  const allowCancel = Boolean(onClose && initialTarget && initialSource);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scelta lingua"
    >
      <div className={`relative mx-auto w-full max-w-[480px] ${UI_RADIUS.surface} max-h-[90vh] overflow-y-auto border border-hairline bg-canvas p-5 pb-6 sm:my-6`}>
        <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
          Benvenuto
        </p>
        <h2 className="mt-2 font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
          Scegli le tue lingue
        </h2>
        <p className="mt-2 text-body-md text-muted">
          Quella che vuoi imparare e quella da cui parti.
        </p>

        <section className="mt-6">
          <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
            Quale lingua vuoi imparare?
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TARGET_OPTIONS.map((opt) => {
              const selected = target === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setTargetLocal(opt.code);
                    if (source && (opt.code as string) === (source as string)) {
                      setSourceLocal(null);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 ${UI_RADIUS.surface} border bg-canvas p-3 ${UI_INTERACTION.fastTransition} ${
                    selected
                      ? 'border-primary bg-surface-card'
                      : 'border-hairline hover:bg-surface-card'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="text-3xl leading-none">{opt.flag}</span>
                  <span className="text-body-sm font-medium text-ink">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
            Da quale lingua parti?
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SOURCE_OPTIONS.map((opt) => {
              const selected = source === opt.code;
              const disabled = sourceConflict(opt.code);
              return (
                <button
                  key={opt.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSourceLocal(opt.code)}
                  className={`flex flex-col items-center gap-1 ${UI_RADIUS.surface} border bg-canvas p-3 ${UI_INTERACTION.fastTransition} ${
                    disabled
                      ? 'border-hairline opacity-40 cursor-not-allowed'
                      : selected
                        ? 'border-primary bg-surface-card'
                        : 'border-hairline hover:bg-surface-card'
                  }`}
                  aria-pressed={selected}
                  aria-disabled={disabled}
                  title={disabled ? 'Non puoi partire dalla stessa lingua che vuoi imparare' : undefined}
                >
                  <span className="text-3xl leading-none">{opt.flag}</span>
                  <span className="text-body-sm font-medium text-ink">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-7 flex items-center justify-end gap-2">
          {allowCancel && (
            <button
              type="button"
              onClick={onClose}
              className="text-body-sm font-medium text-muted underline-offset-2 hover:underline"
            >
              Annulla
            </button>
          )}
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            Inizia
          </Button>
        </div>
      </div>
    </div>
  );
}
