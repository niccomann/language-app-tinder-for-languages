import type { Variants } from 'framer-motion';

// Exponential ease-out: confident deceleration, no bounce/overshoot.
// Matches the route-transition curve already used in App.tsx.
export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export const cardVariants: Variants = {
  enter: () => ({
    scale: 0.8,
    opacity: 0,
    y: 50,
  }),
  center: {
    scale: 1,
    opacity: 1,
    y: 0,
    x: 0,
    rotate: 0,
    transition: {
      duration: 0.3,
      ease: EASE_OUT_EXPO,
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    rotate: direction > 0 ? 20 : -20,
    transition: {
      duration: 0.3,
      ease: EASE_OUT_EXPO,
    },
  }),
};

export const revealContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};
