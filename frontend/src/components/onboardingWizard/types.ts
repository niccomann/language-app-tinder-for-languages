import type { UserProfile } from '../../services/userApi';

export interface WizardDraft {
  target_language: string;
  proficiency_level: UserProfile['proficiency_level'];
  daily_goal_minutes: number;
  display_name: string;
  age: number | null;
}

export const DEFAULT_DRAFT: WizardDraft = {
  target_language: 'de',
  proficiency_level: 'beginner',
  daily_goal_minutes: 10,
  display_name: '',
  age: null,
};

export interface StepProps {
  draft: WizardDraft;
  onAdvance: (patch: Partial<WizardDraft>) => void;
  onBack?: () => void;
}
