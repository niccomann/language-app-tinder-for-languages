import { useState } from 'react';
import { useCopy, useLanguage } from '../i18n/languageContext';
import { getStaticCopy } from '../i18n/staticCopy';
import type { SourceLocale, TargetLanguage } from '../i18n/languageStorage';
import { SOURCE_FLAGS, SOURCE_LOCALES, TARGET_FLAGS, TARGET_LANGUAGES } from '../i18n/languageMeta';
import { Button, UI_INTERACTION, UI_RADIUS } from './ui';

const TARGETS = TARGET_LANGUAGES;
const SOURCES = SOURCE_LOCALES;

interface OnboardingModalProps {
  initialTarget?: TargetLanguage | null;
  initialSource?: SourceLocale | null;
  onClose?: () => void;
}

export function OnboardingModal({ initialTarget, initialSource, onClose }: OnboardingModalProps) {
  const { setTarget, setSource } = useLanguage();
  const ctxCopy = useCopy();
  const [target, setTargetLocal] = useState<TargetLanguage | null>(initialTarget ?? null);
  const [source, setSourceLocal] = useState<SourceLocale | null>(initialSource ?? null);

  // The modal mirrors the SOURCE the user is currently building, so labels live-update
  // in that locale (e.g. picking source=fr shows the rest of the modal in French immediately).
  const copy = source ? getStaticCopy(source) : ctxCopy;
  const oc = copy.onboardingChooser;

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
      aria-label={oc.title}
    >
      <div className={`relative mx-auto w-full max-w-[480px] ${UI_RADIUS.surface} max-h-[90vh] overflow-y-auto border border-hairline bg-canvas p-5 pb-6 sm:my-6`}>
        <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
          {oc.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
          {oc.title}
        </h2>

        <section className="mt-6">
          <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
            {oc.targetQuestion}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TARGETS.map((code) => {
              const selected = target === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setTargetLocal(code);
                    if (source && (code as string) === (source as string)) {
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
                  <span className="text-3xl leading-none">{TARGET_FLAGS[code]}</span>
                  <span className="text-body-sm font-medium text-ink capitalize">{copy.targetLanguageNames[code]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
            {oc.sourceQuestion}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SOURCES.map((code) => {
              const selected = source === code;
              const disabled = sourceConflict(code);
              // Display the LOCALE_NAME from that locale's JSON (e.g. "Italiano", "English", "Français").
              const localeName = getStaticCopy(code).localeName;
              return (
                <button
                  key={code}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSourceLocal(code)}
                  className={`flex flex-col items-center gap-1 ${UI_RADIUS.surface} border bg-canvas p-3 ${UI_INTERACTION.fastTransition} ${
                    disabled
                      ? 'border-hairline opacity-40 cursor-not-allowed'
                      : selected
                        ? 'border-primary bg-surface-card'
                        : 'border-hairline hover:bg-surface-card'
                  }`}
                  aria-pressed={selected}
                  aria-disabled={disabled}
                  title={disabled ? oc.sourceConflictTooltip : undefined}
                >
                  <span className="text-3xl leading-none">{SOURCE_FLAGS[code]}</span>
                  <span className="text-body-sm font-medium text-ink">{localeName}</span>
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
              {oc.cancel}
            </button>
          )}
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {oc.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}
