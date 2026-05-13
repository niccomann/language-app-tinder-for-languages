import { useCallback, useState, type ComponentProps } from 'react';

import { FirstVocabularyOnboarding } from './FirstVocabularyOnboarding';
import { GoalStep } from './onboardingWizard/GoalStep';
import { IdentityStep } from './onboardingWizard/IdentityStep';
import { LanguageStep } from './onboardingWizard/LanguageStep';
import { LevelStep } from './onboardingWizard/LevelStep';
import { WelcomeStep } from './onboardingWizard/WelcomeStep';
import { DEFAULT_DRAFT, type WizardDraft } from './onboardingWizard/types';
import { useUser } from '../contexts/useUser';
import { createUser, patchUser } from '../services/userApi';

export type WizardPhase = 'welcome' | 'language' | 'level' | 'goal' | 'identity' | 'vocab';

type VocabularyOnboardingProps = Omit<ComponentProps<typeof FirstVocabularyOnboarding>, 'onComplete'>;

interface OnboardingWizardProps {
  /** When the user has POSTed identity but not yet finished vocab scan, jump here. */
  initialPhase?: WizardPhase;
  /** Props forwarded to FirstVocabularyOnboarding (everything except onComplete). */
  vocabularyOnboardingProps: VocabularyOnboardingProps;
}

const ORDER: WizardPhase[] = ['welcome', 'language', 'level', 'goal', 'identity', 'vocab'];

function nextPhase(p: WizardPhase): WizardPhase {
  const i = ORDER.indexOf(p);
  return ORDER[Math.min(i + 1, ORDER.length - 1)];
}

function prevPhase(p: WizardPhase): WizardPhase {
  const i = ORDER.indexOf(p);
  return ORDER[Math.max(i - 1, 0)];
}

export function OnboardingWizard({
  initialPhase = 'welcome',
  vocabularyOnboardingProps,
}: OnboardingWizardProps) {
  const { userId, refreshProfile } = useUser();
  const [phase, setPhase] = useState<WizardPhase>(initialPhase);
  const [draft, setDraft] = useState<WizardDraft>(DEFAULT_DRAFT);
  const [posting, setPosting] = useState(false);

  const advance = useCallback(
    async (patch: Partial<WizardDraft>) => {
      const next = { ...draft, ...patch };
      setDraft(next);

      if (phase === 'identity') {
        if (!userId) {
          console.error('OnboardingWizard: missing userId at identity step');
          return;
        }
        setPosting(true);
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
          setPhase('vocab');
        } catch (err) {
          console.error('createUser failed', err);
          // Keep the user on the identity step; the next "Continua" tap will retry.
        } finally {
          setPosting(false);
        }
        return;
      }

      setPhase(nextPhase(phase));
    },
    [draft, phase, refreshProfile, userId],
  );

  const back = useCallback(() => setPhase((p) => prevPhase(p)), []);

  const onVocabComplete = useCallback(() => {
    if (!userId) return;
    void patchUser(userId, { onboarding_completed: true })
      .then(() => refreshProfile())
      .catch((err) => console.error('patchUser onboarding_completed failed', err));
  }, [refreshProfile, userId]);

  if (posting) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p>Salvataggio…</p>
      </div>
    );
  }

  switch (phase) {
    case 'welcome':
      return <WelcomeStep draft={draft} onAdvance={advance} />;
    case 'language':
      return <LanguageStep draft={draft} onAdvance={advance} onBack={back} />;
    case 'level':
      return <LevelStep draft={draft} onAdvance={advance} onBack={back} />;
    case 'goal':
      return <GoalStep draft={draft} onAdvance={advance} onBack={back} />;
    case 'identity':
      return <IdentityStep draft={draft} onAdvance={advance} onBack={back} />;
    case 'vocab':
      return <FirstVocabularyOnboarding {...vocabularyOnboardingProps} onComplete={onVocabComplete} />;
  }
}
