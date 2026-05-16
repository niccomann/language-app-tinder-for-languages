import { Button } from '../ui';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

export function WelcomeStep({ onAdvance, stepIndex, stepCount }: StepProps) {
  return (
    <WizardShell stepIndex={stepIndex} stepCount={stepCount} title="" subline="">
      <div className="flex flex-col items-center text-center">
        <div className="text-7xl leading-none" aria-hidden>
          🦉
        </div>
        <h1 className="mt-6 font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
          Ciao! Sono il tuo coach.
        </h1>
        <p className="mt-3 text-body-sm text-muted">
          Imparare una lingua, 5 minuti al giorno.
        </p>
        <Button variant="primary" className="mt-8 w-full max-w-xs" onClick={() => onAdvance({})}>
          Inizia
        </Button>
        <p className="mt-4 text-caption text-muted">Nessun account richiesto</p>
      </div>
    </WizardShell>
  );
}
