import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookOpen, FlaskConical, SlidersHorizontal } from 'lucide-react';
import { Card } from './Card';
import { SwipeButtons } from './SwipeButtons';
import { ProgressBar } from './ProgressBar';
import { LearningFeedbackBanner } from './LearningFeedbackBanner';
import { LearningFiltersPanel } from './LearningFiltersPanel';
import { LearningCategoryStrip } from './LearningCategoryStrip';
import { LearningSystemMenu } from './LearningSystemMenu';
import { AppScreen, NavButton, ScreenHeader, SurfacePanel, ToolIntroGate, UI_RADIUS } from './ui';
import type { Flashcard, LearningFeedback } from '../types';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';

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
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  learningSystemOpen: boolean;
  onLearningSystemOpenChange: (open: boolean) => void;
  learningFeedback: LearningFeedback | null;
  onDismissLearningFeedback: () => void;
  swipeInFlight: boolean;
}

export function LearningScreen({
  currentCard,
  nextCard,
  progress,
  totalCards,
  onSwipe,
  onOpenLibrary,
  onOpenGrammarLab,
  categories,
  selectedCategories,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  filtersOpen,
  onFiltersOpenChange,
  learningSystemOpen,
  onLearningSystemOpenChange,
  learningFeedback,
  onDismissLearningFeedback,
  swipeInFlight,
}: LearningScreenProps) {
  const copy = useCopy();
  const ls = copy.learningScreen;
  const target = useTargetLanguage();
  const targetName = copy.targetLanguageNames[target];
  const [lastSwipeDirection, setLastSwipeDirection] = useState<'left' | 'right'>('left');

  const handleDirectionalSwipe = (direction: 'left' | 'right') => {
    setLastSwipeDirection(direction);
    onSwipe(direction);
  };

  return (
    <ToolIntroGate
      storageKey="learningScreen"
      title={formatCopy(ls.headerTitle, { language: targetName })}
      steps={[ls.headerSubtitle, ...copy.learningSystemMenu.points]}
    >
    <AppScreen width="compact" contentClassName="min-h-dvh bg-canvas px-4 py-4">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="w-full space-y-3">
          <ScreenHeader
            title={formatCopy(ls.headerTitle, { language: targetName })}
            subtitle={ls.headerSubtitle}
            density="compact"
            actions={(
              <div className={`${UI_RADIUS.pill} bg-surface-card px-3 py-2 text-caption font-medium text-ink border border-hairline`}>
                {selectedCategories.length}/{categories.length || 0}
              </div>
            )}
          />

          <div className="grid auto-rows-fr grid-cols-3 gap-2">
            <NavButton
              onClick={() => onFiltersOpenChange(true)}
              icon={<SlidersHorizontal size={17} />}
              label="Filters"
              color="coral"
              size="small"
            />
            <NavButton
              onClick={onOpenLibrary}
              icon={<BookOpen size={18} />}
              label="Library"
              color="coral-strong"
              size="small"
            />
            <NavButton
              onClick={onOpenGrammarLab}
              icon={<FlaskConical size={17} />}
              label="Grammar"
              color="teal"
              size="small"
            />
          </div>

          <LearningCategoryStrip
            categories={categories}
            selectedCategories={selectedCategories}
            onOpenFilters={() => onFiltersOpenChange(true)}
          />
          {learningSystemOpen && (
            <LearningSystemMenu
              isOpen={learningSystemOpen}
              onToggle={() => onLearningSystemOpenChange(!learningSystemOpen)}
            />
          )}
          <LearningFeedbackBanner
            feedback={learningFeedback}
            onDismiss={onDismissLearningFeedback}
          />
        </header>

        <section className="flex min-h-0 flex-col gap-3">
        <div className="relative flex min-h-[520px] items-start justify-center">
          {nextCard && (
            <div className="absolute inset-x-0 top-0 w-full scale-90 opacity-20 pointer-events-none blur-sm -z-10">
              <div className={`bg-canvas ${UI_RADIUS.surface} overflow-hidden border border-hairline`}>
                <div className="aspect-[4/3] relative overflow-hidden bg-surface-card">
                  {nextCard.image_base64 ? (
                    <img src={`data:image/jpeg;base64,${nextCard.image_base64}`} alt={nextCard.word} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-card">
                      <span className="text-display-md font-display font-normal text-muted">{nextCard.word.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 text-center">
                  <h2 className="font-display font-normal text-display-sm text-ink">{nextCard.word}</h2>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" custom={lastSwipeDirection === 'right' ? 1 : -1}>
            {currentCard && (
              <Card
                key={currentCard.id}
                flashcard={currentCard}
                onSwipe={handleDirectionalSwipe}
                swipeDirection={lastSwipeDirection}
              />
            )}
          </AnimatePresence>

          {!currentCard && (
            <SurfacePanel className="w-full border-dashed border-hairline bg-canvas text-center" padding="lg">
              <h2 className="font-display font-normal text-display-sm text-ink">{ls.noCardsTitle}</h2>
              <p className="mt-2 text-body-sm font-medium text-muted">
                {ls.noCardsBody}
              </p>
              <button
                onClick={() => onFiltersOpenChange(true)}
                className={`mt-5 ${UI_RADIUS.control} bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary`}
              >
                {ls.openFiltersButton}
              </button>
            </SurfacePanel>
          )}
        </div>

        <SwipeButtons onSwipe={handleDirectionalSwipe} disabled={!currentCard || swipeInFlight} />

        <ProgressBar progress={progress} totalCards={totalCards} />

        <div className="pb-2 text-center text-caption font-medium text-muted">
          ← {copy.swipeButtons.dontKnow} · {copy.swipeButtons.know} →
        </div>
        </section>
      </main>

      <LearningFiltersPanel
        isOpen={filtersOpen}
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={onToggleCategory}
        onSelectAll={onSelectAllCategories}
        onDeselectAll={onDeselectAllCategories}
        onClose={() => onFiltersOpenChange(false)}
      />
    </AppScreen>
    </ToolIntroGate>
  );
}
