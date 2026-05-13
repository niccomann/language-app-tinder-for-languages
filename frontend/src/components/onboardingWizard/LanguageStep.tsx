import type { StepProps } from './types';

const OPTIONS: Array<{ code: string; label: string; enabled: boolean }> = [
  { code: 'de', label: '🇩🇪 Tedesco', enabled: true },
  { code: 'fr', label: '🇫🇷 Francese', enabled: false },
  { code: 'it', label: '🇮🇹 Italiano', enabled: false },
  { code: 'es', label: '🇪🇸 Spagnolo', enabled: false },
];

export function LanguageStep({ draft, onAdvance, onBack }: StepProps) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Cosa vuoi imparare?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            disabled={!opt.enabled}
            onClick={() => onAdvance({ target_language: opt.code })}
            style={{
              padding: 16,
              borderRadius: 12,
              opacity: opt.enabled ? 1 : 0.5,
              cursor: opt.enabled ? 'pointer' : 'not-allowed',
              border: draft.target_language === opt.code ? '2px solid #4f46e5' : '1px solid #ddd',
              background: 'white',
            }}
          >
            {opt.label}
            {!opt.enabled && <div style={{ fontSize: 11, marginTop: 4 }}>presto</div>}
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
