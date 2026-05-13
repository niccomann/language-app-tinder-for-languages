import { useState } from 'react';

import type { StepProps } from './types';

export function IdentityStep({ draft, onAdvance, onBack }: StepProps) {
  const [name, setName] = useState(draft.display_name);
  const [ageStr, setAgeStr] = useState(draft.age?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError('Il nome deve avere fra 1 e 40 caratteri.');
      return;
    }
    let age: number | null = null;
    if (ageStr.trim() !== '') {
      const parsed = Number.parseInt(ageStr, 10);
      if (!Number.isInteger(parsed) || parsed < 5 || parsed > 120) {
        setError('Età non valida (5–120, oppure lascia vuoto).');
        return;
      }
      age = parsed;
    }
    setError(null);
    onAdvance({ display_name: trimmed, age });
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Come ti chiami?</h2>
      <p style={{ color: '#666', marginTop: 8 }}>Solo per personalizzare l'esperienza.</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Il tuo nome"
        style={{ width: '100%', padding: 12, marginTop: 16, borderRadius: 8, border: '1px solid #ddd' }}
      />
      <input
        type="number"
        value={ageStr}
        onChange={(e) => setAgeStr(e.target.value)}
        placeholder="Età (opzionale)"
        style={{ width: '100%', padding: 12, marginTop: 12, borderRadius: 8, border: '1px solid #ddd' }}
      />
      {error && <p style={{ color: '#dc2626', marginTop: 12 }}>{error}</p>}
      <button
        type="button"
        onClick={submit}
        style={{ marginTop: 16, padding: '14px 24px', width: '100%', borderRadius: 999 }}
      >
        Continua
      </button>
      <p style={{ marginTop: 12, fontSize: 11, color: '#999', textAlign: 'center' }}>
        Salvato sul tuo dispositivo. Nessun login, nessuna mail.
      </p>
      {onBack && (
        <button type="button" onClick={onBack} style={{ marginTop: 16 }}>
          ← Indietro
        </button>
      )}
    </div>
  );
}
