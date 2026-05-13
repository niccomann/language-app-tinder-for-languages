import { useCallback, useState, type ReactNode } from 'react';

import { GoalStep } from './onboardingWizard/GoalStep';
import { IdentityStep } from './onboardingWizard/IdentityStep';
import { LanguageStep } from './onboardingWizard/LanguageStep';
import { LevelStep } from './onboardingWizard/LevelStep';
import { WelcomeStep } from './onboardingWizard/WelcomeStep';
import { DEFAULT_DRAFT, type WizardDraft } from './onboardingWizard/types';
import { useUser } from '../contexts/useUser';
import { createUser } from '../services/userApi';

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
          setSubmitError('Identità non ancora pronta. Riprova fra un istante.');
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
          setSubmitError(`Salvataggio fallito: ${msg}`);
        } finally {
          setPosting(false);
        }
        return;
      }

      setPhase(nextPhase(phase));
    },
    [draft, phase, refreshProfile, userId, onComplete],
  );

  const back = useCallback(() => setPhase((p) => prevPhase(p)), []);

  if (posting) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p>Salvataggio…</p>
      </div>
    );
  }

  const banner = submitError ? (
    <div
      role="alert"
      style={{
        margin: '0 24px',
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        fontSize: 13,
      }}
    >
      {submitError}
    </div>
  ) : null;

  let stepNode: ReactNode = null;
  switch (phase) {
    case 'welcome':
      stepNode = <WelcomeStep draft={draft} onAdvance={advance} />;
      break;
    case 'language':
      stepNode = <LanguageStep draft={draft} onAdvance={advance} onBack={back} />;
      break;
    case 'level':
      stepNode = <LevelStep draft={draft} onAdvance={advance} onBack={back} />;
      break;
    case 'goal':
      stepNode = <GoalStep draft={draft} onAdvance={advance} onBack={back} />;
      break;
    case 'identity':
      stepNode = <IdentityStep draft={draft} onAdvance={advance} onBack={back} />;
      break;
  }

  return (
    <>
      {banner}
      {stepNode}
    </>
  );
}
