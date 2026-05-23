import { useState } from 'react';
import { Button, UI_RADIUS } from '../ui';
import { useCopy } from '../../i18n/languageContext';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

const inputClass = `w-full ${UI_RADIUS.control} border border-hairline bg-canvas px-4 py-3 text-body-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`;

export function IdentityStep({ draft, onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  const id = useCopy().onboardingWizard.identity;
  const [name, setName] = useState(draft.display_name);
  const [ageStr, setAgeStr] = useState(draft.age?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError(id.errorName);
      return;
    }
    let age: number | null = null;
    if (ageStr.trim() !== '') {
      const parsed = Number.parseInt(ageStr, 10);
      if (!Number.isInteger(parsed) || parsed < 5 || parsed > 120) {
        setError(id.errorAge);
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
      eyebrow={id.eyebrow}
      title={id.title}
      subline={id.subline}
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={id.namePlaceholder}
          autoFocus
          className={inputClass}
        />
        <input
          type="number"
          value={ageStr}
          onChange={(e) => setAgeStr(e.target.value)}
          placeholder={id.agePlaceholder}
          className={inputClass}
        />
        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}
        <Button variant="primary" className="mt-2 w-full" onClick={submit}>
          {id.submit}
        </Button>
        <p className="text-center text-caption text-muted">{id.footnote}</p>
      </div>
    </WizardShell>
  );
}
