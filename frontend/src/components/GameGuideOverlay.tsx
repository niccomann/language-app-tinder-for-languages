import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Play, X } from 'lucide-react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { featureGuides, type FeatureGuideId, type FeatureGuideTone } from '../gamification/featureGuideManifest';
import { hasSeenFeatureGuide, markAllFeatureGuidesDismissed, markFeatureGuideSeen, shouldDeferGuideUntilVocabularyScan } from '../gamification/featureGuideStorage';
import { copy } from '../i18n/staticCopy';
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { StreamingSpeechBubble } from './StreamingSpeechBubble';

interface GameGuideOverlayProps {
  guideId: FeatureGuideId;
  routeKey: string;
}

const toneStyles = {
  practice: {
    accent: 'text-success',
    panel: 'border-success/20 bg-success/10',
    action: 'bg-success text-ink hover:opacity-90 focus-visible:ring-success',
  },
  science: {
    accent: 'text-accent-teal',
    panel: 'border-accent-teal/20 bg-accent-teal/10',
    action: 'bg-accent-teal text-ink hover:opacity-90 focus-visible:ring-accent-teal',
  },
  map: {
    accent: 'text-accent-amber',
    panel: 'border-accent-amber/20 bg-accent-amber/10',
    action: 'bg-accent-amber text-ink hover:opacity-90 focus-visible:ring-accent-amber',
  },
  library: {
    accent: 'text-primary',
    panel: 'border-hairline bg-surface-soft',
    action: 'bg-primary text-on-primary hover:bg-primary-active focus-visible:ring-primary',
  },
  grammar: {
    accent: 'text-primary',
    panel: 'border-hairline bg-surface-soft',
    action: 'bg-primary text-on-primary hover:bg-primary-active focus-visible:ring-primary',
  },
} satisfies Record<FeatureGuideTone, { accent: string; panel: string; action: string }>;

const eventMotion = {
  opacity: [0, 1, 1],
  y: [10, -4, 0],
  rotate: [0, -2, 1, 0],
  scale: [0.96, 1.04, 1],
};

const eventTransition = {
  duration: 0.62,
  ease: 'easeInOut',
} satisfies Transition;

export function GameGuideOverlay({ guideId, routeKey }: GameGuideOverlayProps) {
  return (
    <GameGuideOverlayContent
      key={`${routeKey}:${guideId}`}
      guideId={guideId}
    />
  );
}

function GameGuideOverlayContent({ guideId }: Pick<GameGuideOverlayProps, 'guideId'>) {
  const guide = featureGuides[guideId];
  const prefersReducedMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(() => hasSeenFeatureGuide(guideId));
  const [eventKey] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [framesReady, setFramesReady] = useState(false);
  const [speechState, setSpeechState] = useState({ stepIndex: 0, isTyping: true });
  const [step, setStep] = useState<'watch' | 'briefing'>('watch');
  const activeFrame = guide.frames[frameIndex % guide.frames.length];
  const styles = toneStyles[guide.tone];
  const overlayCopy = copy.featureGuideOverlay;

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled(guide.frames.map((frame) => preloadImage(frame.src))).then(() => {
      if (!cancelled) {
        setFramesReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [guide.frames]);

  useEffect(() => {
    if (prefersReducedMotion || guide.frames.length < 2) return undefined;

    if (speechState.isTyping) {
      const frameTimers = [180, 380, 580].map((delay, index) => window.setTimeout(() => {
        setFrameIndex((index + 1) % guide.frames.length);
      }, delay));
      const settleFrame = window.setTimeout(() => {
        setFrameIndex(0);
      }, 780);

      return () => {
        frameTimers.forEach((timer) => window.clearTimeout(timer));
        window.clearTimeout(settleFrame);
      };
    }

    if (!framesReady) return undefined;

    const showReactionFrame = window.setTimeout(() => {
      setFrameIndex(1);
    }, 130);
    const settleFrame = window.setTimeout(() => {
      setFrameIndex(0);
    }, 560);

    return () => {
      window.clearTimeout(showReactionFrame);
      window.clearTimeout(settleFrame);
    };
  }, [eventKey, framesReady, guide.frames.length, prefersReducedMotion, speechState.isTyping]);

  const motionProps = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
        transition: { duration: 0.01 },
      };
    }

    if (speechState.isTyping) {
      return {
        animate: {
          y: [0, -10, 0],
          rotate: [0, -2, 2, 0],
          scale: [1, 1.035, 1],
        },
        transition: {
          duration: 0.86,
          ease: 'easeInOut',
        } satisfies Transition,
      };
    }

    return {
      animate: eventMotion,
      transition: eventTransition,
    };
  }, [prefersReducedMotion, speechState.isTyping]);

  const goToBriefing = () => {
    setStep('briefing');
  };

  const enterFeature = () => {
    markFeatureGuideSeen(guide.id);
    setDismissed(true);
  };

  const dismissAllGuides = () => {
    markAllFeatureGuidesDismissed();
    setDismissed(true);
  };

  if (dismissed || shouldDeferGuideUntilVocabularyScan()) {
    return null;
  }

  return (
    <section
      data-testid="game-guide-overlay"
      data-guide-id={guide.id}
      data-layout="fullscreen"
      data-motion-mode="event"
      className="fixed inset-0 z-50 flex min-h-dvh w-screen items-stretch overflow-y-auto bg-canvas text-ink"
      role="dialog"
      aria-modal="true"
      aria-label={overlayCopy.ariaLabel}
    >
      <div className="relative flex min-h-dvh w-full flex-col px-5 py-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={enterFeature}
          className={`absolute right-5 top-5 z-10 inline-flex min-h-11 min-w-11 items-center justify-center ${UI_RADIUS.control} border border-hairline bg-canvas text-body ${UI_INTERACTION.fastTransition} hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          aria-label={overlayCopy.closeLabel}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 py-10">
          {step === 'watch' ? (
            <>
              <motion.div
                key={`${guide.id}-${eventKey}`}
                data-testid="guide-animated-character"
                data-speaking={speechState.isTyping ? 'true' : 'false'}
                className="flex w-full items-center justify-center"
                {...motionProps}
              >
                <div
                  data-asset-rendering="transparent-cutout"
                  className="relative aspect-square w-[min(78vw,460px)] bg-transparent"
                >
                  <img
                    key={activeFrame.key}
                    src={activeFrame.src}
                    alt=""
                    className="h-full w-full object-contain"
                    style={{ filter: 'drop-shadow(0 25px 25px rgba(0,0,0,0.15))' }}
                    draggable={false}
                  />
                </div>
              </motion.div>

              <p className={`text-caption-uppercase tracking-[1.5px] font-medium uppercase ${styles.accent}`}>
                {overlayCopy.eyebrow}
              </p>

              <button
                type="button"
                onClick={goToBriefing}
                className={`inline-flex min-h-12 items-center justify-center gap-2 ${UI_RADIUS.control} bg-primary px-6 py-3 text-button font-semibold text-on-primary ${UI_INTERACTION.fastTransition} hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
              >
                {overlayCopy.continueAction}
                <ArrowRight size={17} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={dismissAllGuides}
                className={`inline-flex items-center text-caption font-medium text-muted underline-offset-2 hover:text-ink hover:underline ${UI_INTERACTION.fastTransition}`}
              >
                {overlayCopy.dismissAllAction}
              </button>
            </>
          ) : (
            <StreamingSpeechBubble
              key={eventKey}
              steps={[{ eyebrow: overlayCopy.eyebrow, title: guide.title, body: guide.body }]}
              playbackKey={eventKey}
              showStepIndicator={false}
              contentClassName="min-h-[255px] sm:min-h-[300px]"
              className={`w-full border ${styles.panel}`}
              onStepChange={(stepIndex) => setSpeechState((current) => (
                current.stepIndex === stepIndex ? current : { ...current, stepIndex }
              ))}
              onTypingChange={(isTyping) => setSpeechState((current) => (
                current.isTyping === isTyping ? current : { ...current, isTyping }
              ))}
            >
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={enterFeature}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 ${UI_RADIUS.control} px-5 py-3 text-base font-semibold ${UI_INTERACTION.fastTransition} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.action}`}
                >
                  <Play size={18} aria-hidden="true" />
                  {guide.actionLabel}
                </button>
              </div>

              <button
                type="button"
                onClick={dismissAllGuides}
                className={`mt-4 inline-flex items-center text-caption font-medium text-muted underline-offset-2 hover:text-ink hover:underline ${UI_INTERACTION.fastTransition}`}
              >
                {overlayCopy.dismissAllAction}
              </button>
            </StreamingSpeechBubble>
          )}
        </div>
      </div>
    </section>
  );
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}
