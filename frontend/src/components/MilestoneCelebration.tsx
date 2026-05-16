import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MilestoneEvent } from '../types';
import { UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';

interface MilestoneCelebrationProps {
  event: MilestoneEvent | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 2500;

export function MilestoneCelebration({ event, onDismiss }: MilestoneCelebrationProps) {
  const copy = useCopy();
  const m = copy.milestone;

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
            initial={{ scale: 0.7, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <motion.div
              className="text-6xl leading-none"
              aria-hidden
              initial={{ scale: 0.4, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}
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
