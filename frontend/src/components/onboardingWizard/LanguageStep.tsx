import { TARGET_FLAGS, TARGET_LANGUAGES } from '../../i18n/languageMeta';
import type { TargetLanguage } from '../../i18n/languageStorage';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

const LABELS: Record<TargetLanguage, string> = {
  de: 'Tedesco',
  it: 'Italiano',
  fr: 'Francese',
};

export function LanguageStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow="Passo 1"
      title="Cosa vuoi imparare?"
      subline="Scegli la lingua su cui vuoi concentrarti adesso."
      onBack={onBack}
    >
      <div className="grid grid-cols-3 gap-3">
        {TARGET_LANGUAGES.map((code) => {
          const selected = draft.target_language === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onAdvance({ target_language: code })}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-2 ${UI_RADIUS.surface} border bg-canvas p-4 ${UI_INTERACTION.fastTransition} ${
                selected ? 'border-primary bg-surface-card' : 'border-hairline hover:bg-surface-card'
              }`}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {TARGET_FLAGS[code]}
              </span>
              <span className="text-body-sm font-medium text-ink">{LABELS[code]}</span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
