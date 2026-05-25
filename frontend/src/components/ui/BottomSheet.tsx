import { useEffect, type ReactNode } from 'react';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { EASE_OUT_EXPO } from '../../utils/animations';

interface BottomSheetProps {
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  /** Tailwind max-width applied from the `sm` breakpoint up (desktop). */
  maxWidthClass?: string;
  showHandle?: boolean;
  /** Override the grab-handle color, e.g. a light handle over a dark header image. */
  handleClassName?: string;
  /** When true (default) children get a scrollable body. Set false if the caller
   *  manages its own scroll region (e.g. a pinned header + flex-1 overflow area). */
  scrollBody?: boolean;
  className?: string;
}

/**
 * Mobile-first dialog: a bottom sheet that slides up and is dismissable by
 * dragging the handle down or tapping the backdrop. On `sm+` it becomes a
 * centered dialog. The panel is a flex column so callers manage their own
 * internal scroll region (e.g. a sticky header + scrollable body).
 */
export function BottomSheet({
  onClose,
  children,
  ariaLabel,
  maxWidthClass = 'sm:max-w-lg',
  showHandle = true,
  handleClassName = 'bg-ink/25',
  scrollBody = true,
  className = '',
}: BottomSheetProps) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        role="dialog"
        aria-modal
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose();
        }}
        initial={reduce ? { opacity: 0 } : { y: '100%' }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-hairline bg-canvas shadow-soft sm:max-h-[85dvh] sm:rounded-2xl ${maxWidthClass} ${className}`}
      >
        {showHandle && (
          <div
            className="absolute left-1/2 top-2 z-30 -translate-x-1/2 cursor-grab touch-none px-6 py-1 active:cursor-grabbing sm:hidden"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className={`h-1.5 w-10 rounded-full ${handleClassName}`} />
          </div>
        )}
        {scrollBody ? <div className="flex-1 min-h-0 overflow-y-auto">{children}</div> : children}
      </motion.div>
    </motion.div>
  );
}
