import { useEffect, useState } from 'react';
import { CompletionScreen } from './CompletionScreen';
import { FeatureHubScreen } from './FeatureHubScreen';
import { FirstVocabularyOnboarding } from './FirstVocabularyOnboarding';
import { GrammarPlacementAssessment } from './GrammarPlacementAssessment';
import { LearningPathHome } from './LearningPathHome';
import { LearningScreen } from './LearningScreen';
import { LoadingSpinner, ErrorState } from './ui';
import { YourVocabularyScreen } from './YourVocabularyScreen';
import { useCategories } from '../hooks/useCategories';
import { useLearningSession } from '../hooks/useLearningSession';
import { useCopy } from '../i18n/languageContext';
import { isPathMode, PATH_MODE_TO_VIEW, type LearningRouteMode } from '../routes/appRoutes';
import {
  markFirstVocabularyOnboardingDone,
  readFirstVocabularyOnboardingDone,
  shouldShowFirstVocabularyOnboarding,
} from './firstVocabularyOnboardingMeta';

interface CardStackProps {
  mode: LearningRouteMode;
  onOpenLearningPath: () => void;
  onStartLearning: () => void;
  onOpenLearningFilters: () => void;
  onOpenLearningSystem: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
  onNavigateToFeature: (path: string) => void;
  onFirstVocabularyOnboardingComplete?: () => void;
}

export const CardStack = ({
  mode,
  onOpenLearningPath,
  onStartLearning,
  onOpenLearningFilters,
  onOpenLearningSystem,
  onOpenLibrary,
  onOpenGrammarLab,
  onNavigateToFeature,
  onFirstVocabularyOnboardingComplete,
}: CardStackProps) => {
  const copy = useCopy();
  const categories = useCategories();
  const [firstVocabularyOnboardingDone, setFirstVocabularyOnboardingDone] = useState(readFirstVocabularyOnboardingDone);
  const {
    currentCard,
    nextCard,
    progress,
    learningSummary,
    learningFeedback,
    flashcards,
    loading,
    error,
    isComplete,
    loadFlashcards,
    handleSwipe,
    reset,
    clearLearningFeedback,
  } = useLearningSession();

  useEffect(() => {
    if (!categories.loading && !categories.error) {
      loadFlashcards(categories.selectedCategories);
    }
  }, [categories.error, categories.loading, categories.selectedCategories, loadFlashcards]);

  const handleChangeFilters = () => {
    reset();
    onOpenLearningFilters();
  };

  const handleCompleteFirstVocabularyOnboarding = () => {
    markFirstVocabularyOnboardingDone();
    setFirstVocabularyOnboardingDone(true);
    onFirstVocabularyOnboardingComplete?.();
    onOpenLearningPath();
  };

  // Error state
  if (error || categories.error) {
    return (
      <ErrorState
        title={copy.cardStack.connectionError}
        message={error || categories.error || copy.cardStack.unknownError}
        onRetry={() => loadFlashcards(categories.selectedCategories)}
      />
    );
  }

  // Loading state
  if (categories.loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (loading && flashcards.length === 0) {
    return <LoadingSpinner message="Loading flashcards..." />;
  }

  if (shouldShowFirstVocabularyOnboarding({
    mode,
    firstVocabularyOnboardingDone,
    learningSummary,
    progress,
  })) {
    return (
      <FirstVocabularyOnboarding
        currentCard={currentCard}
        nextCard={nextCard}
        progress={progress}
        totalCards={flashcards.length}
        onSwipe={handleSwipe}
        onComplete={handleCompleteFirstVocabularyOnboarding}
      />
    );
  }

  if (mode === 'vocabulary') {
    return (
      <YourVocabularyScreen
        onBack={onOpenLearningPath}
        onStartLearning={onStartLearning}
      />
    );
  }

  if (mode === 'review' || mode === 'explore' || mode === 'explore_grammar' || mode === 'explore_map') {
    return (
      <FeatureHubScreen
        kind={mode}
        selectedCategoriesCount={categories.selectedCategories.length}
        categoriesCount={categories.allCategories.length}
        onBack={onOpenLearningPath}
        onNavigateToFeature={onNavigateToFeature}
      />
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <CompletionScreen
        progress={progress}
        onRestart={() => {
          reset();
          onStartLearning();
        }}
        onChangeCategories={handleChangeFilters}
        onOpenLibrary={onOpenLibrary}
        onOpenGrammarLab={onOpenGrammarLab}
      />
    );
  }

  if (isPathMode(mode)) {
    return (
      <LearningPathHome
        pathView={PATH_MODE_TO_VIEW[mode]}
        learningSummary={learningSummary}
        progress={progress}
        totalCards={flashcards.length}
        categoriesCount={categories.allCategories.length}
        selectedCategoriesCount={categories.selectedCategories.length}
        onNavigateToFeature={onNavigateToFeature}
      />
    );
  }

  if (mode === 'grammar_placement') {
    return (
      <GrammarPlacementAssessment
        onBack={onOpenLearningPath}
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
      filtersOpen={mode === 'filters'}
      onFiltersOpenChange={(open) => {
        if (open) {
          onOpenLearningFilters();
        } else {
          onStartLearning();
        }
      }}
      learningSystemOpen={mode === 'system'}
      onLearningSystemOpenChange={(open) => {
        if (open) {
          onOpenLearningSystem();
        } else {
          onStartLearning();
        }
      }}
      learningFeedback={learningFeedback}
      onClearLearningFeedback={clearLearningFeedback}
    />
  );
};
