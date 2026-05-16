import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps, WizardDraft } from './types';

const OPTIONS: Array<{
  value: WizardDraft['proficiency_level'];
  emoji: string;
  label: string;
  hint: string;
}> = [
  { value: 'beginner', emoji: '🌱', label: 'Principiante', hint: 'Parto da zero' },
  { value: 'a1_a2', emoji: '📖', label: 'Conosco qualcosa', hint: 'Livello A1–A2' },
  { value: 'b1_b2', emoji: '🎓', label: 'Intermedio', hint: 'Livello B1–B2' },
];

const LANGUAGE_NAMES: Record<string, string> = {
  de: 'tedesco',
  it: 'italiano',
  fr: 'francese',
};

export function LevelStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  const langName = LANGUAGE_NAMES[draft.target_language] ?? draft.target_language;
  return (
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow="Passo 2"
      title={`Quanto ${langName} sai già?`}
      subline="Scegli ciò che ti rappresenta meglio oggi."
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const selected = draft.proficiency_level === opt.value;
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
