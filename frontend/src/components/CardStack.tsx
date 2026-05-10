import { useState, useEffect, useRef } from 'react';
import { CategorySelector } from './CategorySelector';
import { WordsLibraryEnriched } from './WordsLibraryEnriched';
import { GrammarLab } from './GrammarLab';
import { CompletionScreen } from './CompletionScreen';
import { LearningScreen } from './LearningScreen';
import { LoadingSpinner, ErrorState } from './ui';
import { useCategories } from '../hooks/useCategories';
import { useLearningSession } from '../hooks/useLearningSession';
import { useLanguage } from '../contexts/LanguageContext';

export const CardStack = () => {
  const { language } = useLanguage();
  const [showCategorySelector, setShowCategorySelector] = useState(true);
  const [showWordsLibrary, setShowWordsLibrary] = useState(false);
  const [showGrammarLab, setShowGrammarLab] = useState(false);

  const categories = useCategories();
  const session = useLearningSession();

  // Reset to category selector whenever the active language changes
  const prevLanguageRef = useRef(language);
  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      prevLanguageRef.current = language;
      setShowCategorySelector(true);
      setShowWordsLibrary(false);
      setShowGrammarLab(false);
      session.reset();
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartLearning = async () => {
    setShowCategorySelector(false);
    await session.loadFlashcards(categories.selectedCategories);
  };

  const handleBackToCategories = () => {
    setShowCategorySelector(true);
    session.reset();
  };

  const handleOpenLibrary = () => {
    setShowWordsLibrary(true);
  };

  const handleCloseLibrary = () => {
    setShowWordsLibrary(false);
  };

  const handleOpenGrammarLab = () => {
    setShowGrammarLab(true);
  };

  const handleCloseGrammarLab = () => {
    setShowGrammarLab(false);
  };

  // Show Grammar Lab
  if (showGrammarLab) {
    return <GrammarLab onBack={handleCloseGrammarLab} />;
  }

  // Show Words Library
  if (showWordsLibrary) {
    return <WordsLibraryEnriched onClose={handleCloseLibrary} />;
  }

  // Loading state
  if (categories.loading) {
    return <LoadingSpinner message="Loading..." />;
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
        onOpenLibrary={handleOpenLibrary}
        onOpenGrammarLab={handleOpenGrammarLab}
      />
    );
  }

  // Error state
  if (session.error || categories.error) {
    return (
      <ErrorState
        title="Connection Error"
        message={session.error || categories.error || 'Unknown error'}
        onRetry={() => session.loadFlashcards(categories.selectedCategories)}
      />
    );
  }

  // Completion screen
  if (session.isComplete) {
    return (
      <CompletionScreen
        progress={session.progress}
        onRestart={session.reset}
        onChangeCategories={handleBackToCategories}
        onOpenLibrary={handleOpenLibrary}
        onOpenGrammarLab={handleOpenGrammarLab}
      />
    );
  }

  // Learning screen
  return (
    <LearningScreen
      currentCard={session.currentCard}
      nextCard={session.nextCard}
      progress={session.progress}
      totalCards={session.flashcards.length}
      onSwipe={session.handleSwipe}
      onBackToCategories={handleBackToCategories}
      onOpenLibrary={handleOpenLibrary}
      onOpenGrammarLab={handleOpenGrammarLab}
      onGenerateVideo={session.generateSoraVideo}
      youtubeVideo={session.youtubeVideo}
      onCloseVideoModal={session.closeVideoModal}
      showVideoSourceSelector={session.showVideoSourceSelector}
      currentWord={session.currentWord}
      onSelectYouTube={session.selectYouTubeVideos}
      onSelectAI={session.selectAIVideos}
      onCloseVideoSourceSelector={session.closeVideoSourceSelector}
      showReelFeed={session.showReelFeed}
      onCloseReelFeed={session.closeReelFeed}
      onShowConfirmation={session.showLearnedWordConfirmation}
      showAIReelFeed={session.showAIReelFeed}
      onCloseAIReelFeed={session.closeAIReelFeed}
      showLearnedConfirmation={session.showLearnedConfirmation}
      onConfirmWordLearned={session.confirmWordLearned}
      onSkipWordConfirmation={session.skipWordConfirmation}
      showSoraModal={session.showSoraModal}
      onCloseSoraModal={session.closeSoraModal}
      videoJobId={session.videoJobId}
    />
  );
};
