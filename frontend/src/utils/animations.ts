import type { Variants } from 'framer-motion';

export const cardVariants: Variants = {
  enter: (direction: number) => ({
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
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    rotate: direction > 0 ? 20 : -20,
    transition: {
      duration: 0.3,
    },
  }),
};

export const stackCardVariants: Variants = {
  hidden: {
    scale: 0.9,
    opacity: 0.5,
    y: 10,
  },
  visible: {
    scale: 0.95,
    opacity: 0.7,
    y: 5,
  },
};
