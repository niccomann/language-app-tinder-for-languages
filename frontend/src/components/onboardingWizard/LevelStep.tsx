import { useCopy } from '../../i18n/languageContext';
import { isTargetLanguage } from '../../i18n/languageStorage';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps, WizardDraft } from './types';

const OPTIONS: Array<{ value: WizardDraft['proficiency_level']; emoji: string }> = [
  { value: 'beginner', emoji: '🌱' },
  { value: 'a1_a2', emoji: '📖' },
  { value: 'b1_b2', emoji: '🎓' },
];

export function LevelStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  const l = useCopy().onboardingWizard.level;
  const target = draft.target_language;
  const title = isTargetLanguage(target) ? l.titleByTarget[target] : '';
  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow={l.eyebrow}
      title={title}
      subline={l.subline}
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const selected = draft.proficiency_level === opt.value;
          const meta = l.options[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAdvance({ proficiency_level: opt.value })}
              aria-pressed={selected}
              className={`flex items-center gap-4 ${UI_RADIUS.surface} border bg-canvas p-4 text-left ${UI_INTERACTION.fastTransition} ${
                selected ? 'border-primary bg-surface-card' : 'border-hairline hover:bg-surface-card'
              }`}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {opt.emoji}
              </span>
              <span className="flex flex-col">
                <span className="text-body-sm font-medium text-ink">{meta.label}</span>
                <span className="text-caption text-muted">{meta.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
