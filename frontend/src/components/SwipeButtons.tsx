import { X, Check } from 'lucide-react';
import { UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';

interface SwipeButtonsProps {
  onSwipe: (direction: 'left' | 'right') => void;
  disabled: boolean;
}

export const SwipeButtons = ({ onSwipe, disabled }: SwipeButtonsProps) => {
  const copy = useCopy();
  const labels = copy.swipeButtons;
  return (
    <div className="flex gap-12 justify-center items-center">
      <button
        type="button"
        onClick={() => onSwipe('left')}
        disabled={disabled}
        data-swipe="left"
        className={`relative w-24 h-24 ${UI_RADIUS.touchIcon} bg-canvas border border-hairline text-ink flex items-center justify-center transition-colors duration-150 hover:bg-surface-card disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label={labels.dontKnow}
      >
        <X size={40} strokeWidth={3.5} />
      </button>
      <button
        type="button"
        onClick={() => onSwipe('right')}
        disabled={disabled}
        data-swipe="right"
        className={`relative w-24 h-24 ${UI_RADIUS.touchIcon} bg-success text-ink flex items-center justify-center transition-colors duration-150 hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label={labels.know}
      >
        <Check size={40} strokeWidth={3.5} />
      </button>
    </div>
  );
};
