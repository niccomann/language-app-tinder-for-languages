import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import {
  mascotPersonas,
  resolveMascotPersona,
  mascotStateLabels,
  type MascotPersona,
  type MascotReactionState,
} from '../gamification/mascotManifest';

interface MascotReactionProps {
  state: MascotReactionState;
  className?: string;
  eventKey?: number;
  persona?: MascotPersona | 'auto';
  size?: 'default' | 'compact';
  speaking?: boolean;
}

type MascotMotionProfile = 'still' | 'coachHop' | 'coachShake' | 'coachLift' | 'explorerSwoop' | 'explorerNod' | 'explorerLeap' | 'robotPop' | 'robotWobble' | 'robotBoost';

const motionProfiles = {
  still: { opacity: [1], x: [0], y: [0], rotate: [0], scale: [1] },
  coachHop: { y: [0, -14, 0], scale: [1, 1.08, 1] },
  coachShake: { x: [0, -5, 5, 0], rotate: [0, -2, 2, 0] },
  coachLift: { y: [0, -18, 0], scale: [1, 1.12, 1] },
  explorerSwoop: { x: [0, 8, -4, 0], y: [0, -12, -4, 0], rotate: [0, 4, -2, 0] },
  explorerNod: { y: [0, -5, 0], rotate: [0, -8, 6, 0] },
  explorerLeap: { x: [0, 5, 0], y: [0, -22, 0], scale: [1, 1.1, 1] },
  robotPop: { y: [0, -8, 0], scale: [1, 1.14, 0.98, 1] },
  robotWobble: { x: [0, -4, 4, -2, 0], rotate: [0, 5, -5, 2, 0] },
  robotBoost: { y: [0, -16, -6, 0], scale: [1, 1.08, 1.04, 1], rotate: [0, -3, 3, 0] },
} satisfies Record<MascotMotionProfile, Record<string, number[]>>;

const personaMotionProfiles = {
  coach: {
    idle: 'still',
    correct: 'coachHop',
    wrong: 'coachShake',
    levelUp: 'coachLift',
  },
  explorer: {
    idle: 'still',
    correct: 'explorerSwoop',
    wrong: 'explorerNod',
    levelUp: 'explorerLeap',
  },
  robot: {
    idle: 'still',
    correct: 'robotPop',
    wrong: 'robotWobble',
    levelUp: 'robotBoost',
  },
} satisfies Record<MascotPersona, Record<MascotReactionState, MascotMotionProfile>>;

export function MascotReaction({
  state,
  className = '',
  eventKey = 0,
  persona: requestedPersona = 'auto',
  size = 'default',
  speaking = false,
}: MascotReactionProps) {
  const prefersReducedMotion = useReducedMotion();
  const persona = useMemo(() => (
    requestedPersona === 'auto'
      ? resolveMascotPersona(eventKey, state)
      : requestedPersona
  ), [eventKey, requestedPersona, state]);
  const animationKey = `${persona}-${state}-${eventKey}-${speaking ? 'speaking' : 'silent'}`;
  const [frameSequence, setFrameSequence] = useState({ animationKey, frameIndex: 0 });
  const framesByState = mascotPersonas[persona]?.framesByState ?? mascotPersonas.coach.framesByState;
  const frames = framesByState[state] ?? framesByState.idle;
  const frameIndex = frameSequence.animationKey === animationKey ? frameSequence.frameIndex : 0;
  const activeFrame = frames[frameIndex % frames.length];
  const motionProfile = personaMotionProfiles[persona]?.[state] ?? 'still';

  useEffect(() => {
    if (prefersReducedMotion || state === 'idle' || frames.length < 2) return undefined;

    if (speaking) {
      const frameTimer = window.setInterval(() => {
        setFrameSequence((current) => ({
          animationKey,
          frameIndex: current.animationKey === animationKey ? current.frameIndex + 1 : 1,
        }));
      }, 220);

      return () => window.clearInterval(frameTimer);
    }

    const showReactionFrame = window.setTimeout(() => {
      setFrameSequence({ animationKey, frameIndex: 1 });
    }, 120);
    const settleFrame = window.setTimeout(() => {
      setFrameSequence({ animationKey, frameIndex: 0 });
    }, 520);

    return () => {
      window.clearTimeout(showReactionFrame);
      window.clearTimeout(settleFrame);
    };
  }, [animationKey, frames.length, prefersReducedMotion, speaking, state]);

  const motionProps = useMemo(() => {
    if (prefersReducedMotion || state === 'idle') {
      return {
        animate: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 },
        transition: { duration: 0.01 },
      };
    }

    if (speaking) {
      return {
        animate: {
          y: [0, -8, 0],
          rotate: [0, -2, 2, 0],
          scale: [1, 1.04, 1],
        },
        transition: {
          duration: 0.64,
          repeat: Infinity,
          ease: 'easeInOut',
        } satisfies Transition,
      };
    }

    return {
      animate: motionProfiles[motionProfile],
      transition: {
        duration: 0.72,
        ease: 'easeInOut',
      } satisfies Transition,
    };
  }, [motionProfile, prefersReducedMotion, speaking, state]);

  const sizeClass = size === 'compact'
    ? 'min-h-20 max-w-[96px]'
    : 'min-h-40 max-w-[220px]';

  return (
    <motion.figure
      key={`${state}-${eventKey}-${prefersReducedMotion ? 'reduced' : 'animated'}`}
      data-testid="mascot-reaction"
      data-reaction-state={state}
      data-mascot-persona={persona}
      data-event-key={eventKey}
      data-speaking={speaking ? 'true' : 'false'}
      data-motion-mode={state === 'idle' ? 'still' : 'event'}
      data-motion-profile={state === 'idle' ? 'still' : motionProfile}
      data-motion-policy="prefers-reduced-motion"
      aria-live="polite"
      className={`flex w-full flex-col items-center justify-center ${sizeClass} ${className}`}
      {...motionProps}
    >
      <div
        data-asset-rendering="transparent-cutout"
        className="relative aspect-square w-full bg-transparent"
      >
        <img
          key={activeFrame.key}
          src={activeFrame.src}
          alt={`${mascotPersonas[persona].label} mascot ${mascotStateLabels[state]}`}
          className="h-full w-full object-contain drop-shadow-sm"
          draggable={false}
        />
      </div>
      <figcaption className="sr-only">
        {mascotStateLabels[state]}
      </figcaption>
    </motion.figure>
  );
}
