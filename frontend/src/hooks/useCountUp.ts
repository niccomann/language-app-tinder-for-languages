import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Animates an integer from 0 up to `target` with an ease-out curve.
 * Honors prefers-reduced-motion by jumping straight to the final value.
 */
export function useCountUp(target: number, durationMs = 800, startDelayMs = 0): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    const timeout = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(step);
    }, startDelayMs);

    return () => {
      window.clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, startDelayMs, reduce]);

  return value;
}
