import { TARGET_FLAGS, TARGET_LANGUAGES } from '../../i18n/languageMeta';
import type { TargetLanguage } from '../../i18n/languageStorage';
import type { StepProps } from './types';

const LABELS: Record<TargetLanguage, string> = {
  de: 'Tedesco',
  it: 'Italiano',
  fr: 'Francese',
};

export function LanguageStep({ draft, onAdvance, onBack }: StepProps) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Cosa vuoi imparare?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {TARGET_LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onAdvance({ target_language: code })}
            style={{
              padding: 16,
              borderRadius: 12,
              cursor: 'pointer',
              border: draft.target_language === code ? '2px solid #4f46e5' : '1px solid #ddd',
              background: 'white',
            }}
          >
            {TARGET_FLAGS[code]} {LABELS[code]}
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
