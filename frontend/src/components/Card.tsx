import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Volume2, Loader2 } from 'lucide-react';
import type { AdaptiveFlashcard, Flashcard } from '../types';
import { cardVariants } from '../utils/animations';
import { getImageSrc } from '../utils/imageHelper';
import { api } from '../services/api';
import { UI_RADIUS } from './ui';
import { WordMasteryBadge } from './WordMasteryBadge';
import { reportClientError } from '../utils/clientError';

interface CardProps {
  flashcard: Flashcard | AdaptiveFlashcard;
  onSwipe: (direction: 'left' | 'right') => void;
  swipeDirection?: 'left' | 'right';
}

export const Card = ({ flashcard, onSwipe, swipeDirection = 'left' }: CardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const adaptiveCard = 'knowledge_level' in flashcard ? flashcard : null;
  
  const handlePlayAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    
    setIsPlaying(true);
    try {
      const response = await api.speakText(flashcard.word, flashcard.language);
      const audio = new Audio(response.audio_base64);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (error) {
      reportClientError('Failed to play audio:', error);
      setIsPlaying(false);
    }
  };
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      onSwipe(direction);
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      variants={cardVariants}
      custom={swipeDirection === 'right' ? 1 : -1}
      initial="enter"
      animate="center"
      exit="exit"
      style={{
        x,
        rotate,
      }}
      className="absolute inset-x-0 top-0 w-full cursor-grab active:cursor-grabbing"
    >
      <div className={`bg-canvas border border-hairline ${UI_RADIUS.surface} overflow-hidden`}>
        <div className="aspect-[4/3] relative overflow-hidden bg-surface-card">
          {flashcard.image_base64 ? (
            <img
              src={getImageSrc(flashcard.image_base64)}
              alt={flashcard.word}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-card">
              <span className="text-display-lg font-display font-normal text-ink">{flashcard.word.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/15 to-transparent"></div>
          {adaptiveCard && (
            <div className="absolute left-4 top-4 max-w-[52%]">
              <WordMasteryBadge
                level={adaptiveCard.knowledge_level}
                confidenceScore={adaptiveCard.confidence_score}
                selectionReason={adaptiveCard.selection_reason}
                compact
              />
            </div>
          )}
          <div className={`absolute top-5 right-5 px-3 py-1 bg-surface-card ${UI_RADIUS.pill} text-caption font-medium text-ink capitalize border border-hairline`}>
            {flashcard.category}
          </div>
        </div>
        <div className="px-12 py-10 text-center bg-canvas">
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-display font-normal text-[64px] leading-[1.05] tracking-[-1px] text-ink">
              {flashcard.word}
            </h2>
            <button
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className={`p-3 ${UI_RADIUS.touchIcon} border border-hairline transition-colors duration-150 ${
                isPlaying
                  ? 'bg-primary text-on-primary'
                  : 'bg-canvas text-ink hover:bg-surface-card'
              }`}
            >
              {isPlaying ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={24} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
