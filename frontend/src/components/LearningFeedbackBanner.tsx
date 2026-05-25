import { ArrowUpRight, CheckCircle2, X } from 'lucide-react';
import type { LearningFeedback } from '../types';
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { MascotSpeechCallout } from './MascotSpeechCallout';
import { useCopy } from '../i18n/languageContext';

interface LearningFeedbackBannerProps {
  feedback: LearningFeedback | null;
  onDismiss: () => void;
}

// Soft accent backgrounds: cream-tinted with a colored border so the
// banner reads as a positive signal without a saturated full-bleed fill.
const toneClasses: Record<LearningFeedback['tone'], string> = {
  level_up: 'bg-success/10 border border-success/40 text-ink',
  progress: 'bg-primary/10 border border-primary/40 text-ink',
  review: 'bg-accent-amber/15 border border-accent-amber/40 text-ink',
};

export function LearningFeedbackBanner({ feedback, onDismiss }: LearningFeedbackBannerProps) {
  const copy = useCopy();
  if (!feedback) return null;

  const Icon = feedback.tone === 'level_up' ? ArrowUpRight : CheckCircle2;
  const mascotState = feedback.tone === 'level_up' ? 'levelUp' : 'correct';

  return (
    <div className={`${UI_RADIUS.surface} ${toneClasses[feedback.tone]} p-2`}>
      <MascotSpeechCallout
        testId="learning-feedback-bubble"
        narrate={false}
        steps={[{
          eyebrow: feedback.tone === 'level_up' ? copy.learningFeedback.levelUp : copy.learningFeedback.learningSignal,
          title: feedback.title,
          body: feedback.message,
        }]}
        reactionState={mascotState}
        restingState={mascotState}
        size="compact"
        className="gap-3 lg:grid-cols-[minmax(76px,96px)_minmax(0,1fr)]"
        mascotClassName="hidden shrink-0 sm:flex"
        bubbleClassName={`border-0 bg-canvas/75 p-3 shadow-none ring-0 ${UI_RADIUS.surface}`}
        bubbleContentClassName="min-h-[100px]"
        titleClassName="mt-1 min-h-[2.8rem] text-base font-semibold leading-snug"
        bodyClassName="mt-1 min-h-[2.8rem] text-body-sm font-medium leading-5 opacity-80"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-caption-uppercase tracking-[1.5px] opacity-80 uppercase">
            <div className={`${UI_RADIUS.touchIcon} flex h-8 w-8 shrink-0 items-center justify-center bg-canvas/70`}>
              <Icon size={16} />
            </div>
            {copy.learningFeedback.signalSaved}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className={`${UI_RADIUS.touchIcon} ${UI_INTERACTION.transition} flex h-9 w-9 shrink-0 items-center justify-center hover:bg-canvas/70`}
            aria-label={copy.a11y.dismissFeedback}
          >
            <X size={16} />
          </button>
        </div>
      </MascotSpeechCallout>
    </div>
  );
}
