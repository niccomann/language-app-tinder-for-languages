import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { MilestoneEvent } from '../types';
import { UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';
import { EASE_OUT_EXPO } from '../utils/animations';

interface MilestoneCelebrationProps {
  event: MilestoneEvent | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 2500;

export function MilestoneCelebration({ event, onDismiss }: MilestoneCelebrationProps) {
  const copy = useCopy();
  const m = copy.milestone;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!event) return;
    const t = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [event, onDismiss]);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          role="status"
          aria-live="polite"
          onClick={onDismiss}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className={`mx-auto w-full max-w-[320px] ${UI_RADIUS.hero} border border-hairline bg-canvas px-6 py-7 text-center shadow-sm`}
            initial={reduce ? { opacity: 0 } : { scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            <motion.div
              className="text-6xl leading-none"
              aria-hidden
              initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: EASE_OUT_EXPO, delay: 0.05 }}
            >
              🎉
            </motion.div>
            <p className="mt-4 text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
              {m.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
              {formatCopy(m.count, { count: event.count })}
            </h2>
            <p className="mt-2 text-body-sm text-muted">
              {m.subtitle}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
