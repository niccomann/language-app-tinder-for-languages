import { getStaticCopy } from '../../i18n/staticCopy';
import { useLanguage } from '../../i18n/languageContext';
import { SOURCE_FLAGS, SOURCE_LOCALES } from '../../i18n/languageMeta';
import type { SourceLocale } from '../../i18n/languageStorage';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

// First step of onboarding: rendered in English because no source locale is
// stored yet. As soon as the user picks, we persist via setSource() (no
// reload) so every subsequent step renders in their chosen language.
export function SourceStep({ onAdvance, stepIndex, stepCount }: StepProps) {
  const { setSource } = useLanguage();
  const s = getStaticCopy('en').onboardingWizard.source;

  return (
    <WizardShell stepIndex={stepIndex} stepCount={stepCount} title={s.title} subline={s.subline}>
      <div className="grid grid-cols-3 gap-3">
        {SOURCE_LOCALES.map((code) => {
          const localeName = getStaticCopy(code).localeName;
          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                setSource(code as SourceLocale, { reload: false });
                onAdvance({});
              }}
              className={`flex flex-col items-center gap-2 ${UI_RADIUS.surface} border border-hairline bg-canvas p-4 ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {SOURCE_FLAGS[code]}
              </span>
              <span className="text-body-sm font-medium text-ink">{localeName}</span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
