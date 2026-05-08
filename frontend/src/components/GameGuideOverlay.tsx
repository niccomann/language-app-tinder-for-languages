import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { featureGuides, type FeatureGuideId, type FeatureGuideTone } from '../gamification/featureGuideManifest';
import { hasSeenFeatureGuide, markFeatureGuideSeen, shouldDeferGuideUntilVocabularyScan } from '../gamification/featureGuideStorage';
import { copy } from '../i18n/staticCopy';
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { StreamingSpeechBubble } from './StreamingSpeechBubble';

interface GameGuideOverlayProps {
  guideId: FeatureGuideId;
  routeKey: string;
}

const toneStyles = {
  practice: {
    accent: 'text-emerald-700',
    panel: 'border-emerald-200 bg-emerald-50',
    action: 'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500',
  },
  science: {
    accent: 'text-sky-700',
    panel: 'border-sky-200 bg-sky-50',
    action: 'bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-sky-500',
  },
  map: {
    accent: 'text-amber-700',
    panel: 'border-amber-200 bg-amber-50',
    action: 'bg-amber-500 text-slate-950 hover:bg-amber-400 focus-visible:ring-amber-500',
  },
  library: {
    accent: 'text-fuchsia-700',
    panel: 'border-fuchsia-200 bg-fuchsia-50',
    action: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 focus-visible:ring-fuchsia-500',
  },
  grammar: {
    accent: 'text-indigo-700',
    panel: 'border-indigo-200 bg-indigo-50',
    action: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500',
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
  const [eventKey, setEventKey] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [framesReady, setFramesReady] = useState(false);
  const [speechState, setSpeechState] = useState({ stepIndex: 0, isTyping: true });
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
      const speakingFrameTimer = window.setInterval(() => {
        setFrameIndex((current) => (current + 1) % guide.frames.length);
      }, 320);

      return () => window.clearInterval(speakingFrameTimer);
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
          repeat: Infinity,
          ease: 'easeInOut',
        } satisfies Transition,
      };
    }

    return {
      animate: eventMotion,
      transition: eventTransition,
    };
  }, [prefersReducedMotion, speechState.isTyping]);

  const replayGuide = () => {
    setEventKey((current) => current + 1);
    setFrameIndex(0);
  };

  const enterFeature = () => {
    markFeatureGuideSeen(guide.id);
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
      className="fixed inset-0 z-50 flex min-h-dvh w-screen items-stretch overflow-y-auto bg-white text-slate-950 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={overlayCopy.ariaLabel}
    >
      <div className="relative flex min-h-dvh w-full flex-col px-5 py-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={enterFeature}
          className={`absolute right-5 top-5 z-10 inline-flex min-h-11 min-w-11 items-center justify-center ${UI_RADIUS.control} border border-slate-200 bg-white text-slate-700 shadow-sm ${UI_INTERACTION.fastTransition} hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500`}
          aria-label={overlayCopy.closeLabel}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(390px,0.78fr)] lg:gap-12">
          <motion.div
            key={`${guide.id}-${eventKey}`}
            data-testid="guide-animated-character"
            data-speaking={speechState.isTyping ? 'true' : 'false'}
            className="flex min-h-[42dvh] items-center justify-center lg:min-h-[72dvh]"
            {...motionProps}
          >
            <div
              data-asset-rendering="transparent-cutout"
              className="relative aspect-square w-[min(78vw,520px)] bg-transparent sm:w-[min(62vw,590px)] lg:w-[min(46vw,650px)]"
            >
              <img
                key={activeFrame.key}
                src={activeFrame.src}
                alt=""
                className="h-full w-full object-contain drop-shadow-2xl"
                draggable={false}
              />
            </div>
          </motion.div>

          <StreamingSpeechBubble
            key={eventKey}
            steps={[{ eyebrow: overlayCopy.eyebrow, title: guide.title, body: guide.body }]}
            playbackKey={eventKey}
            showStepIndicator={false}
            contentClassName="min-h-[255px] sm:min-h-[300px]"
            className={`shadow-slate-200/80 ${styles.panel}`}
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
                className={`inline-flex min-h-12 items-center justify-center gap-2 ${UI_RADIUS.control} px-5 py-3 text-base font-extrabold shadow-lg shadow-slate-200 ${UI_INTERACTION.fastTransition} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${styles.action}`}
              >
                <Play size={18} aria-hidden="true" />
                {guide.actionLabel}
              </button>

              <button
                type="button"
                onClick={replayGuide}
                className={`inline-flex min-h-12 items-center justify-center gap-2 ${UI_RADIUS.control} border border-slate-200 bg-white px-5 py-3 text-base font-bold text-slate-800 shadow-sm ${UI_INTERACTION.fastTransition} hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500`}
              >
                <RotateCcw size={18} aria-hidden="true" />
                {overlayCopy.replayAction}
              </button>
            </div>
          </StreamingSpeechBubble>
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
