import { ArrowUpRight, CheckCircle2, X } from 'lucide-react';
import type { LearningFeedback } from '../types';
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { MascotReaction } from './MascotReaction';

interface LearningFeedbackBannerProps {
  feedback: LearningFeedback | null;
  onDismiss: () => void;
}

const toneClasses: Record<LearningFeedback['tone'], string> = {
  level_up: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
  progress: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100',
  review: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
};

export function LearningFeedbackBanner({ feedback, onDismiss }: LearningFeedbackBannerProps) {
  if (!feedback) return null;

  const Icon = feedback.tone === 'level_up' ? ArrowUpRight : CheckCircle2;
  const mascotState = feedback.tone === 'level_up' ? 'levelUp' : 'correct';

  return (
    <div className={`${UI_RADIUS.surface} ${toneClasses[feedback.tone]} border px-4 py-3 shadow-sm`}>
      <div className="flex items-start gap-3">
        <MascotReaction
          state={mascotState}
          size="compact"
          className="hidden shrink-0 sm:flex"
        />
        <div className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-white/70 dark:bg-white/10`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{feedback.title}</p>
          <p className="mt-1 text-sm font-medium opacity-80">{feedback.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={`${UI_RADIUS.touchIcon} ${UI_INTERACTION.transition} flex h-9 w-9 shrink-0 items-center justify-center hover:bg-white/70 dark:hover:bg-white/10`}
          aria-label="Dismiss learning feedback"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
