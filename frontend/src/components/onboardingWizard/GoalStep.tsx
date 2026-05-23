import { useCopy } from '../../i18n/languageContext';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

const OPTIONS: Array<{ minutes: number; emoji: string }> = [
  { minutes: 5, emoji: '☕' },
  { minutes: 10, emoji: '🎯' },
  { minutes: 15, emoji: '🔥' },
  { minutes: 20, emoji: '🚀' },
];

export function GoalStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  const g = useCopy().onboardingWizard.goal;
  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow={g.eyebrow}
      title={g.title}
      subline={g.subline}
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const selected = draft.daily_goal_minutes === opt.minutes;
          const meta = g.options[String(opt.minutes) as keyof typeof g.options];
          return (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => onAdvance({ daily_goal_minutes: opt.minutes })}
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
