import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Volume2, Loader2 } from 'lucide-react';
import type { Flashcard } from '../types';
import { cardVariants } from '../utils/animations';
import { getImageSrc } from '../utils/imageHelper';
import { api } from '../services/api';

interface CardProps {
  flashcard: Flashcard;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

export const Card = ({ flashcard, onSwipe, isTop }: CardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
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
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
    }
  };
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

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
      initial="enter"
      animate="center"
      exit="exit"
      style={{
        x,
        rotate,
      }}
      className="absolute w-full cursor-grab active:cursor-grabbing"
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-100">
        <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {flashcard.image_base64 ? (
            <img
              src={getImageSrc(flashcard.image_base64)}
              alt={flashcard.word}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
              <span className="text-6xl">{flashcard.word.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <div className="absolute top-5 right-5 px-5 py-2.5 bg-white/95 backdrop-blur-md rounded-full text-sm font-bold text-gray-800 capitalize shadow-lg border border-white/50">
            {flashcard.category}
          </div>
        </div>
        <div className="px-12 py-10 text-center bg-gradient-to-b from-white to-gray-50">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 tracking-tight leading-tight">
              {flashcard.word}
            </h2>
            <button
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className={`p-3 rounded-full transition-all ${
                isPlaying 
                  ? 'bg-indigo-500 text-white animate-pulse' 
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
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
