import { useEffect, useState } from 'react';
import { CompletionScreen } from './CompletionScreen';
import { LearningScreen } from './LearningScreen';
import { LoadingSpinner, ErrorState } from './ui';
import { useCategories } from '../hooks/useCategories';
import { useLearningSession } from '../hooks/useLearningSession';

interface CardStackProps {
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
}

export const CardStack = ({ onOpenLibrary, onOpenGrammarLab }: CardStackProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const categories = useCategories();
  const {
    currentCard,
    nextCard,
    progress,
    flashcards,
    loading,
    error,
    isComplete,
    loadFlashcards,
    handleSwipe,
    reset,
  } = useLearningSession();

  useEffect(() => {
    if (!categories.loading) {
      loadFlashcards(categories.selectedCategories);
    }
  }, [categories.loading, categories.selectedCategories, loadFlashcards]);

  const handleChangeFilters = () => {
    reset();
    setFiltersOpen(true);
  };

  // Loading state
  if (categories.loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (loading && flashcards.length === 0) {
    return <LoadingSpinner message="Loading flashcards..." />;
  }

  // Error state
  if (error || categories.error) {
    return (
      <ErrorState
        title="Connection Error"
        message={error || categories.error || 'Unknown error'}
        onRetry={() => loadFlashcards(categories.selectedCategories)}
      />
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <CompletionScreen
        progress={progress}
        onRestart={reset}
        onChangeCategories={handleChangeFilters}
        onOpenLibrary={onOpenLibrary}
        onOpenGrammarLab={onOpenGrammarLab}
      />
    );
  }

  // Learning screen
  return (
    <LearningScreen
      currentCard={currentCard}
      nextCard={nextCard}
      progress={progress}
      totalCards={flashcards.length}
      onSwipe={handleSwipe}
      onOpenLibrary={onOpenLibrary}
      onOpenGrammarLab={onOpenGrammarLab}
      categories={categories.allCategories}
      selectedCategories={categories.selectedCategories}
      onToggleCategory={categories.toggleCategory}
      onSelectAllCategories={categories.selectAll}
      onDeselectAllCategories={categories.deselectAll}
      filtersOpen={filtersOpen}
      onFiltersOpenChange={setFiltersOpen}
    />
  );
};
