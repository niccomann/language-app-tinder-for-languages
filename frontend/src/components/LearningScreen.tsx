import { AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Card } from './Card';
import { SwipeButtons } from './SwipeButtons';
import { ProgressBar } from './ProgressBar';
import { SoraVideoModal } from './SoraVideoModal';
import { VideoModal } from './VideoModal';
import { VideoReel } from './VideoReel';
import { VideoSourceSelector } from './VideoSourceSelector';
import { AIVideoReel } from './AIVideoReel';
import { LearnedWordConfirmation } from './LearnedWordConfirmation';
import { NavButton } from './ui';
import type { Flashcard } from '../types';

interface LearningScreenProps {
  currentCard: Flashcard | null;
  nextCard: Flashcard | null;
  progress: {
    cards_reviewed: number;
    known_count: number;
    unknown_count: number;
  };
  totalCards: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onBackToCategories: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
  onGenerateVideo: () => void;
  youtubeVideo: any;
  onCloseVideoModal: () => void;
  showVideoSourceSelector: boolean;
  currentWord: { word: string; translation: string } | null;
  onSelectYouTube: () => void;
  onSelectAI: () => void;
  onCloseVideoSourceSelector: () => void;
  showReelFeed: boolean;
  onCloseReelFeed: () => void;
  onShowConfirmation: () => void;
  showAIReelFeed: boolean;
  onCloseAIReelFeed: () => void;
  showLearnedConfirmation: boolean;
  onConfirmWordLearned: () => void;
  onSkipWordConfirmation: () => void;
  showSoraModal: boolean;
  onCloseSoraModal: () => void;
  videoJobId: string | null;
}

export function LearningScreen({
  currentCard,
  nextCard,
  progress,
  totalCards,
  onSwipe,
  onBackToCategories,
  onOpenLibrary,
  onOpenGrammarLab,
  onGenerateVideo,
  youtubeVideo,
  onCloseVideoModal,
  showVideoSourceSelector,
  currentWord,
  onSelectYouTube,
  onSelectAI,
  onCloseVideoSourceSelector,
  showReelFeed,
  onCloseReelFeed,
  onShowConfirmation,
  showAIReelFeed,
  onCloseAIReelFeed,
  showLearnedConfirmation,
  onConfirmWordLearned,
  onSkipWordConfirmation,
  showSoraModal,
  onCloseSoraModal,
  videoJobId,
}: LearningScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Learn German
          </h1>
          <div className="flex gap-3">
            <NavButton
              onClick={onBackToCategories}
              icon={<span>📋</span>}
              label="Categories"
              color="indigo"
            />
            <NavButton
              onClick={onOpenLibrary}
              icon={<BookOpen size={18} />}
              label="Library"
              color="purple"
            />
            <NavButton
              onClick={onOpenGrammarLab}
              icon={<span>🧪</span>}
              label="Grammar"
              color="blue"
            />
          </div>
        </div>
        <p className="text-center text-gray-700 mb-6 text-base font-medium bg-white/60 backdrop-blur-sm py-4 px-8 rounded-full border border-gray-200">
          👈 Swipe left: Don't know · Swipe right: Know 👉
        </p>

        <ProgressBar progress={progress} totalCards={totalCards} />
      </div>

      <div className="relative w-full max-w-sm h-[500px] flex items-center justify-center">
        {nextCard && (
          <div className="absolute w-full opacity-20 scale-90 pointer-events-none blur-sm -z-10">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                <img src={nextCard.image_url} alt={nextCard.word} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 text-center">
                <h2 className="text-4xl font-bold text-gray-900">{nextCard.word}</h2>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentCard && (
            <Card
              key={currentCard.id}
              flashcard={currentCard}
              onSwipe={onSwipe}
              isTop={true}
            />
          )}
        </AnimatePresence>
      </div>

      <SwipeButtons onSwipe={onSwipe} disabled={!currentCard} />

      <div className="text-sm text-gray-500">
        Use arrow keys: ← Don't know | Know →
      </div>

      {currentCard && (
        <button
          onClick={onGenerateVideo}
          className="mt-4 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap min-w-fit"
        >
          <span>🎬</span>
          <span>Generate AI Video</span>
        </button>
      )}

      {youtubeVideo && (
        <VideoModal video={youtubeVideo} onClose={onCloseVideoModal} />
      )}

      {showVideoSourceSelector && currentWord && (
        <VideoSourceSelector
          isOpen={showVideoSourceSelector}
          word={currentWord.word}
          translation={currentWord.translation}
          onSelectYouTube={onSelectYouTube}
          onSelectAI={onSelectAI}
          onClose={onCloseVideoSourceSelector}
        />
      )}

      {showReelFeed && currentWord && (
        <VideoReel
          word={currentWord.word}
          translation={currentWord.translation}
          language="de"
          onClose={onCloseReelFeed}
          onShowConfirmation={onShowConfirmation}
        />
      )}

      {showAIReelFeed && currentWord && (
        <AIVideoReel
          word={currentWord.word}
          translation={currentWord.translation}
          language="de"
          onClose={onCloseAIReelFeed}
          onShowConfirmation={onShowConfirmation}
          videoCount={3}
        />
      )}

      {showLearnedConfirmation && currentWord && (
        <LearnedWordConfirmation
          word={currentWord.word}
          translation={currentWord.translation}
          onConfirm={onConfirmWordLearned}
          onSkip={onSkipWordConfirmation}
        />
      )}

      <SoraVideoModal
        isOpen={showSoraModal}
        onClose={onCloseSoraModal}
        jobId={videoJobId}
        word={currentWord?.word || ''}
        translation={currentWord?.translation || ''}
      />
    </div>
  );
}
