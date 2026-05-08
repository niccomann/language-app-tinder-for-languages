import { ArrowUpRight, CheckCircle2, X } from 'lucide-react';
import type { LearningFeedback } from '../types';
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { MascotSpeechCallout } from './MascotSpeechCallout';

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
    <div className={`${UI_RADIUS.surface} ${toneClasses[feedback.tone]} border p-2 shadow-sm`}>
      <MascotSpeechCallout
        testId="learning-feedback-bubble"
        steps={[{
          eyebrow: feedback.tone === 'level_up' ? 'Level up' : 'Learning signal',
          title: feedback.title,
          body: feedback.message,
        }]}
        reactionState={mascotState}
        restingState={mascotState}
        size="compact"
        className="gap-3 lg:grid-cols-[minmax(76px,96px)_minmax(0,1fr)]"
        mascotClassName="hidden shrink-0 sm:flex"
        bubbleClassName={`border-0 bg-white/75 p-3 shadow-none ring-0 dark:bg-white/10 ${UI_RADIUS.surface}`}
        bubbleContentClassName="min-h-[100px]"
        titleClassName="mt-1 min-h-[2.8rem] text-base font-extrabold leading-snug"
        bodyClassName="mt-1 min-h-[2.8rem] text-sm font-semibold leading-5 opacity-80"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-80">
            <div className={`${UI_RADIUS.touchIcon} flex h-8 w-8 shrink-0 items-center justify-center bg-white/70 dark:bg-white/10`}>
              <Icon size={16} />
            </div>
            Signal saved
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
      </MascotSpeechCallout>
    </div>
  );
}
