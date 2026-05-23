import { useCopy } from '../../i18n/languageContext';
import { TARGET_FLAGS, TARGET_LANGUAGES } from '../../i18n/languageMeta';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

export function LanguageStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  const copy = useCopy();
  const l = copy.onboardingWizard.language;
  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow={l.eyebrow}
      title={l.title}
      subline={l.subline}
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
              <span className="text-body-sm font-medium text-ink">{copy.targetLanguageNames[code]}</span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
