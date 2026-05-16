import { useState } from 'react';
import { Button, UI_RADIUS } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

const inputClass = `w-full ${UI_RADIUS.control} border border-hairline bg-canvas px-4 py-3 text-body-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`;

export function IdentityStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
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
    <WizardShell
      stepIndex={stepIndex}
      stepCount={stepCount}
      eyebrow="Passo 4"
      title="Come ti chiami?"
      subline="Solo per personalizzare l'esperienza."
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Il tuo nome"
          autoFocus
          className={inputClass}
        />
        <input
          type="number"
          value={ageStr}
          onChange={(e) => setAgeStr(e.target.value)}
          placeholder="Età (opzionale)"
          className={inputClass}
        />
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        <Button variant="primary" className="mt-2 w-full" onClick={submit}>
          Continua
        </Button>
        <p className="text-center text-caption text-muted">
          Salvato sul tuo dispositivo. Nessun login, nessuna mail.
        </p>
      </div>
    </WizardShell>
  );
}
