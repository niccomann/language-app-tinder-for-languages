import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

const OPTIONS: Array<{ minutes: number; emoji: string; label: string; hint: string }> = [
  { minutes: 5, emoji: '☕', label: '5 min', hint: 'Casual' },
  { minutes: 10, emoji: '🎯', label: '10 min', hint: 'Regolare' },
  { minutes: 15, emoji: '🔥', label: '15 min', hint: 'Serio' },
  { minutes: 20, emoji: '🚀', label: '20 min', hint: 'Intenso' },
];

export function GoalStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow="Passo 3"
      title="Quanto tempo al giorno?"
      subline="Puoi cambiarlo in qualsiasi momento."
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const selected = draft.daily_goal_minutes === opt.minutes;
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
                <span className="text-body-sm font-medium text-ink">{opt.label}</span>
                <span className="text-caption text-muted">{opt.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
