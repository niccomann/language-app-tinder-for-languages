import type { StepProps, WizardDraft } from './types';

const OPTIONS: Array<{ value: WizardDraft['proficiency_level']; label: string }> = [
  { value: 'beginner', label: '🌱 Sono principiante' },
  { value: 'a1_a2', label: '📖 Conosco qualcosa (A1–A2)' },
  { value: 'b1_b2', label: '🎓 Livello intermedio (B1–B2)' },
];

const LANGUAGE_NAMES: Record<string, string> = {
  de: 'tedesco',
  it: 'italiano',
  fr: 'francese',
};

export function LevelStep({ draft, onAdvance, onBack }: StepProps) {
  const langName = LANGUAGE_NAMES[draft.target_language] ?? draft.target_language;
  return (
    <div style={{ padding: 24 }}>
      <h2>Quanto {langName} sai già?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onAdvance({ proficiency_level: opt.value })}
            style={{
              padding: 14,
              borderRadius: 12,
              border: draft.proficiency_level === opt.value ? '2px solid #4f46e5' : '1px solid #ddd',
              background: 'white',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {onBack && (
        <button type="button" onClick={onBack} style={{ marginTop: 24 }}>
          ← Indietro
        </button>
      )}
    </div>
  );
}
