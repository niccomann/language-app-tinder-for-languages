import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { featureGuides, type FeatureGuideId, type FeatureGuideTone } from '../gamification/featureGuideManifest';
import { hasSeenFeatureGuide, markFeatureGuideSeen, shouldDeferGuideUntilVocabularyScan } from '../gamification/featureGuideStorage';

interface GameGuideOverlayProps {
  guideId: FeatureGuideId;
  routeKey: string;
}

const toneStyles = {
  practice: {
    accent: 'text-emerald-300',
    panel: 'border-emerald-300/30 bg-emerald-950/55',
    action: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 focus-visible:ring-emerald-300',
  },
  science: {
    accent: 'text-sky-300',
    panel: 'border-sky-300/30 bg-sky-950/55',
    action: 'bg-sky-500 text-sky-950 hover:bg-sky-400 focus-visible:ring-sky-300',
  },
  map: {
    accent: 'text-amber-300',
    panel: 'border-amber-300/30 bg-amber-950/55',
    action: 'bg-amber-400 text-amber-950 hover:bg-amber-300 focus-visible:ring-amber-200',
  },
  library: {
    accent: 'text-fuchsia-300',
    panel: 'border-fuchsia-300/30 bg-fuchsia-950/55',
    action: 'bg-fuchsia-500 text-fuchsia-950 hover:bg-fuchsia-400 focus-visible:ring-fuchsia-300',
  },
  grammar: {
    accent: 'text-indigo-300',
    panel: 'border-indigo-300/30 bg-indigo-950/55',
    action: 'bg-indigo-400 text-indigo-950 hover:bg-indigo-300 focus-visible:ring-indigo-200',
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
  const activeFrame = guide.frames[frameIndex % guide.frames.length];
  const styles = toneStyles[guide.tone];

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
    if (!framesReady || prefersReducedMotion || guide.frames.length < 2) return undefined;

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
  }, [eventKey, framesReady, guide.frames.length, prefersReducedMotion]);

  const motionProps = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
        transition: { duration: 0.01 },
      };
    }

    return {
      animate: eventMotion,
      transition: eventTransition,
    };
  }, [prefersReducedMotion]);

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
      className="fixed inset-0 z-50 flex min-h-dvh w-screen items-stretch overflow-y-auto bg-slate-950/95 text-white backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Feature introduction"
    >
      <div className="relative flex min-h-dvh w-full flex-col px-5 py-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={enterFeature}
          className="absolute right-5 top-5 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white shadow-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
          aria-label="Chiudi introduzione"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(390px,0.78fr)] lg:gap-12">
          <motion.div
            key={`${guide.id}-${eventKey}`}
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

          <div className={`rounded-lg border p-5 shadow-2xl shadow-black/25 sm:p-7 lg:p-8 ${styles.panel}`}>
            <div className={`mb-5 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold ${styles.accent}`}>
              <Sparkles size={17} aria-hidden="true" />
              Briefing missione
            </div>

            <h2 className="max-w-xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              {guide.title}
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
              {guide.body}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={enterFeature}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 text-base font-extrabold shadow-lg shadow-black/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${styles.action}`}
              >
                <Play size={18} aria-hidden="true" />
                {guide.actionLabel}
              </button>

              <button
                type="button"
                onClick={replayGuide}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-5 py-3 text-base font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
              >
                <RotateCcw size={18} aria-hidden="true" />
                Rivedi animazione
              </button>
            </div>
          </div>
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
