import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Card } from './Card';
import { SwipeButtons } from './SwipeButtons';
import { ProgressBar } from './ProgressBar';
import { CategorySelector } from './CategorySelector';
import { SoraVideoModal } from './SoraVideoModal';
import { VideoModal } from './VideoModal';
import { VideoReel } from './VideoReel';
import { VideoSourceSelector } from './VideoSourceSelector';
import { AIVideoReel } from './AIVideoReel';
import { useCategories } from '../hooks/useCategories';
import { useLearningSession } from '../hooks/useLearningSession';

export const CardStack = () => {
  const [showCategorySelector, setShowCategorySelector] = useState(true);
  
  const categories = useCategories();
  const session = useLearningSession();

  const handleStartLearning = async () => {
    setShowCategorySelector(false);
    await session.loadFlashcards(categories.selectedCategories);
  };

  const handleBackToCategories = () => {
    setShowCategorySelector(true);
    session.reset();
  };

  // Loading state
  if (categories.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Category selection screen
  if (showCategorySelector) {
    return (
      <CategorySelector
        categories={categories.allCategories}
        selectedCategories={categories.selectedCategories}
        onToggleCategory={categories.toggleCategory}
        onStart={handleStartLearning}
        onSelectAll={categories.selectAll}
        onDeselectAll={categories.deselectAll}
      />
    );
  }

  // Error state
  if (session.error || categories.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{session.error || categories.error}</p>
          <button
            onClick={() => session.loadFlashcards(categories.selectedCategories)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Completion screen
  if (session.isComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center max-w-lg">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Excellent Work!
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            You've completed all flashcards in this session
          </p>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100 p-8 mb-10">
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl">
                <div className="text-4xl font-extrabold text-indigo-600 mb-1">{session.progress.cards_reviewed}</div>
                <div className="text-sm font-semibold text-gray-700">Reviewed</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <div className="text-4xl font-extrabold text-green-600 mb-1">{session.progress.known_count}</div>
                <div className="text-sm font-semibold text-gray-700">Known</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl">
                <div className="text-4xl font-extrabold text-red-600 mb-1">{session.progress.unknown_count}</div>
                <div className="text-sm font-semibold text-gray-700">To Review</div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-5 justify-center">
            <button onClick={session.reset} className="flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-extrabold text-lg hover:shadow-2xl transition-all duration-300 shadow-xl hover:scale-105 active:scale-95">
              <RotateCcw size={24} strokeWidth={2.5} />
              <span>Start Over</span>
            </button>
            <button onClick={handleBackToCategories} className="flex items-center gap-3 px-12 py-5 bg-white text-gray-700 border-2 border-gray-300 rounded-2xl font-extrabold text-lg hover:border-indigo-400 hover:shadow-xl hover:text-indigo-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg">
              <span>📋</span>
              <span>Change Categories</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Learning screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Learn German
          </h1>
          <button onClick={handleBackToCategories} className="px-7 py-3.5 text-sm font-bold text-indigo-600 hover:text-white bg-white hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 border-2 border-indigo-300 hover:border-transparent rounded-full transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 active:scale-95">
            <span className="flex items-center gap-2">
              <span>📋</span>
              <span>Categories</span>
            </span>
          </button>
        </div>
        <p className="text-center text-gray-700 mb-6 text-base font-medium bg-white/60 backdrop-blur-sm py-4 px-8 rounded-full border border-gray-200">
          👈 Swipe left: Don't know · Swipe right: Know 👉
        </p>
        
        <ProgressBar progress={session.progress} totalCards={session.flashcards.length} />
      </div>

      <div className="relative w-full max-w-sm h-[500px] flex items-center justify-center">
        {session.nextCard && (
          <div className="absolute w-full opacity-20 scale-90 pointer-events-none blur-sm -z-10">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                <img src={session.nextCard.image_url} alt={session.nextCard.word} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 text-center">
                <h2 className="text-4xl font-bold text-gray-900">{session.nextCard.word}</h2>
              </div>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          {session.currentCard && (
            <Card
              key={session.currentCard.id}
              flashcard={session.currentCard}
              onSwipe={session.handleSwipe}
              isTop={true}
            />
          )}
        </AnimatePresence>
      </div>

      <SwipeButtons
        onSwipe={session.handleSwipe}
        disabled={!session.currentCard}
      />
      
      <div className="text-sm text-gray-500">
        Use arrow keys: ← Don't know | Know →
      </div>

      {/* Generate AI Video Button */}
      {session.currentCard && (
        <button
          onClick={session.generateSoraVideo}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <span>🎬</span>
          <span>Generate AI Video</span>
        </button>
      )}

      {/* YouTube Video Modal (Legacy - kept for backward compatibility) */}
      {session.youtubeVideo && (
        <VideoModal
          video={session.youtubeVideo}
          onClose={session.closeVideoModal}
        />
      )}

      {/* Video Source Selector - Choose between YouTube and AI */}
      {session.showVideoSourceSelector && session.currentWord && (
        <VideoSourceSelector
          isOpen={session.showVideoSourceSelector}
          word={session.currentWord.word}
          translation={session.currentWord.translation}
          onSelectYouTube={session.selectYouTubeVideos}
          onSelectAI={session.selectAIVideos}
          onClose={session.closeVideoSourceSelector}
        />
      )}

      {/* YouTube Video Reel */}
      {session.showReelFeed && session.currentWord && (
        <VideoReel
          word={session.currentWord.word}
          translation={session.currentWord.translation}
          language="de"
          onClose={session.closeReelFeed}
        />
      )}

      {/* AI Video Reel */}
      {session.showAIReelFeed && session.currentWord && (
        <AIVideoReel
          word={session.currentWord.word}
          translation={session.currentWord.translation}
          language="de"
          onClose={session.closeAIReelFeed}
          videoCount={3}
        />
      )}

      {/* Sora Video Modal */}
      <SoraVideoModal
        isOpen={session.showSoraModal}
        onClose={session.closeSoraModal}
        jobId={session.videoJobId}
        word={session.currentWord?.word || ''}
        translation={session.currentWord?.translation || ''}
      />
    </div>
  );
};
