import { Button } from '../ui';
import { useCopy } from '../../i18n/languageContext';
import { WizardShell } from './WizardShell';
import type { StepProps } from './types';

export function WelcomeStep({ onAdvance, onBack, stepIndex, stepCount }: StepProps) {
  const w = useCopy().onboardingWizard.welcome;
  return (
    <WizardShell stepIndex={stepIndex} stepCount={stepCount} title="" subline="" onBack={onBack}>
      <div className="flex flex-col items-center text-center">
        <div className="text-7xl leading-none" aria-hidden>
          🦉
        </div>
        <h1 className="mt-6 font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
          {w.title}
        </h1>
        <p className="mt-3 text-body-sm text-muted">{w.subline}</p>
        <Button variant="primary" className="mt-8 w-full max-w-xs" onClick={() => onAdvance({})}>
          {w.cta}
        </Button>
        <p className="mt-4 text-caption text-muted">{w.footnote}</p>
      </div>
    </WizardShell>
  );
}
