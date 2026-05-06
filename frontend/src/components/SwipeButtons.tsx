import { X, Check } from 'lucide-react';
import { UI_RADIUS } from './ui';

interface SwipeButtonsProps {
  onSwipe: (direction: 'left' | 'right') => void;
  disabled: boolean;
}

export const SwipeButtons = ({ onSwipe, disabled }: SwipeButtonsProps) => {
  return (
    <div className="flex gap-12 justify-center items-center">
      <button
        onClick={() => onSwipe('left')}
        disabled={disabled}
        className={`group relative w-24 h-24 ${UI_RADIUS.touchIcon} bg-gradient-to-br from-red-500 via-red-600 to-pink-600 text-white flex items-center justify-center hover:scale-[1.04] active:scale-95 transition-all duration-300 shadow-2xl shadow-red-400/60 hover:shadow-red-500/80 border-4 border-white hover:border-red-100
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
        aria-label="Don't know"
      >
        <X size={40} strokeWidth={3.5} className="group-hover:rotate-90 transition-transform duration-300" />
        <span className="absolute -bottom-8 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">Don't Know</span>
      </button>
      <button
        onClick={() => onSwipe('right')}
        disabled={disabled}
        className={`group relative w-24 h-24 ${UI_RADIUS.touchIcon} bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 text-white flex items-center justify-center hover:scale-[1.04] active:scale-95 transition-all duration-300 shadow-2xl shadow-green-400/60 hover:shadow-green-500/80 border-4 border-white hover:border-green-100
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
        aria-label="Know"
      >
        <Check size={40} strokeWidth={3.5} className="group-hover:scale-[1.04] transition-transform duration-300" />
        <span className="absolute -bottom-8 text-xs font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">I Know</span>
      </button>
    </div>
  );
};
