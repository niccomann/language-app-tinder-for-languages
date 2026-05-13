import type { StepProps } from './types';

const OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 5, label: '☕ 5 min — Casual' },
  { minutes: 10, label: '🎯 10 min — Regolare' },
  { minutes: 15, label: '🔥 15 min — Serio' },
  { minutes: 20, label: '🚀 20 min — Intenso' },
];

export function GoalStep({ draft, onAdvance, onBack }: StepProps) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Quanto tempo al giorno?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.minutes}
            type="button"
            onClick={() => onAdvance({ daily_goal_minutes: opt.minutes })}
            style={{
              padding: 14,
              borderRadius: 12,
              border: draft.daily_goal_minutes === opt.minutes ? '2px solid #4f46e5' : '1px solid #ddd',
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
