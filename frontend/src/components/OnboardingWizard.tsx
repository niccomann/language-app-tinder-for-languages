import { useCallback, useState, type ReactNode } from 'react';

import { GoalStep } from './onboardingWizard/GoalStep';
import { IdentityStep } from './onboardingWizard/IdentityStep';
import { LanguageStep } from './onboardingWizard/LanguageStep';
import { LevelStep } from './onboardingWizard/LevelStep';
import { WelcomeStep } from './onboardingWizard/WelcomeStep';
import { DEFAULT_DRAFT, type StepProps, type WizardDraft } from './onboardingWizard/types';
import { useUser } from '../contexts/useUser';
import { createUser } from '../services/userApi';
import { LoadingSpinner, UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';

export type WizardPhase = 'welcome' | 'language' | 'level' | 'goal' | 'identity';

interface OnboardingWizardProps {
  /** Fired after createUser + refreshProfile succeed. The parent then unmounts the wizard. */
  onComplete?: () => void;
}

const ORDER: WizardPhase[] = ['welcome', 'language', 'level', 'goal', 'identity'];

function nextPhase(p: WizardPhase): WizardPhase {
  const i = ORDER.indexOf(p);
  return ORDER[Math.min(i + 1, ORDER.length - 1)];
}

function prevPhase(p: WizardPhase): WizardPhase {
  const i = ORDER.indexOf(p);
  return ORDER[Math.max(i - 1, 0)];
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { userId, refreshProfile } = useUser();
  const copy = useCopy();
  const w = copy.onboardingWizard;
  const [phase, setPhase] = useState<WizardPhase>('welcome');
  const [draft, setDraft] = useState<WizardDraft>(DEFAULT_DRAFT);
  const [posting, setPosting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const advance = useCallback(
    async (patch: Partial<WizardDraft>) => {
      const next = { ...draft, ...patch };
      setDraft(next);

      if (phase === 'identity') {
        if (!userId) {
          setSubmitError(w.identityNotReady);
          return;
        }
        setPosting(true);
        setSubmitError(null);
        try {
          await createUser({
            user_id: userId,
            display_name: next.display_name,
            age: next.age,
            target_language: next.target_language,
            proficiency_level: next.proficiency_level,
            daily_goal_minutes: next.daily_goal_minutes,
          });
          await refreshProfile();
          onComplete?.();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setSubmitError(formatCopy(w.saveFailed, { detail: msg }));
        } finally {
          setPosting(false);
        }
        return;
      }

      setPhase(nextPhase(phase));
    },
    [draft, phase, refreshProfile, userId, onComplete, w],
  );

  const back = useCallback(() => setPhase((p) => prevPhase(p)), []);

  if (posting) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center bg-canvas px-4">
        <LoadingSpinner />
        <p className="mt-4 text-body-sm font-medium text-muted">{w.saving}</p>
      </div>
    );
  }

  const stepIndex = ORDER.indexOf(phase);
  const stepCount = ORDER.length;
  const stepProps: Omit<StepProps, 'onBack'> & { onBack?: () => void } = {
    draft,
    onAdvance: advance,
    onBack: phase === 'welcome' ? undefined : back,
    stepIndex,
    stepCount,
  };

  let stepNode: ReactNode = null;
  switch (phase) {
    case 'welcome':
      stepNode = <WelcomeStep {...stepProps} />;
      break;
    case 'language':
      stepNode = <LanguageStep {...stepProps} />;
      break;
    case 'level':
      stepNode = <LevelStep {...stepProps} />;
      break;
    case 'goal':
      stepNode = <GoalStep {...stepProps} />;
      break;
    case 'identity':
      stepNode = <IdentityStep {...stepProps} />;
      break;
  }

  return (
    <>
      {submitError && (
        <div className="mx-auto max-w-[480px] px-4 pt-4">
          <div
            role="alert"
            className={`${UI_RADIUS.control} border border-error/40 bg-error/10 px-4 py-3 text-body-sm text-error`}
          >
            {submitError}
          </div>
        </div>
      )}
      {stepNode}
    </>
  );
}
