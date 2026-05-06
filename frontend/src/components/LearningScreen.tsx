import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookOpen, FlaskConical, SlidersHorizontal } from 'lucide-react';
import { Card } from './Card';
import { SwipeButtons } from './SwipeButtons';
import { ProgressBar } from './ProgressBar';
import { LearningFiltersPanel } from './LearningFiltersPanel';
import { LearningCategoryStrip } from './LearningCategoryStrip';
import { LearningSystemMenu } from './LearningSystemMenu';
import { AppScreen, NavButton, ScreenHeader, SurfacePanel, UI_RADIUS } from './ui';
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
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
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
}: LearningScreenProps) {
  const [lastSwipeDirection, setLastSwipeDirection] = useState<'left' | 'right'>('left');
  const [learningSystemOpen, setLearningSystemOpen] = useState(false);

  const handleDirectionalSwipe = (direction: 'left' | 'right') => {
    setLastSwipeDirection(direction);
    onSwipe(direction);
  };

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 py-4">
      <main className="mx-auto grid w-full max-w-6xl gap-4 lg:min-h-[calc(100dvh-2rem)] lg:grid-cols-[minmax(320px,380px)_minmax(360px,440px)] lg:items-start lg:justify-center">
        <header className="w-full space-y-3">
          <ScreenHeader
            title="Learn German"
            subtitle="Just decide: know it or not. The algorithm adapts the learning path from there."
            density="compact"
            actions={(
              <div className={`${UI_RADIUS.pill} bg-white px-3 py-2 text-sm font-extrabold text-indigo-600 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800 dark:ring-slate-700`}>
                {selectedCategories.length}/{categories.length || 0}
              </div>
            )}
          />

          <div className="grid grid-cols-3 gap-2">
            <NavButton
              onClick={() => onFiltersOpenChange(true)}
              icon={<SlidersHorizontal size={17} />}
              label="Filters"
              color="indigo"
              size="small"
            />
            <NavButton
              onClick={onOpenLibrary}
              icon={<BookOpen size={18} />}
              label="Library"
              color="purple"
              size="small"
            />
            <NavButton
              onClick={onOpenGrammarLab}
              icon={<FlaskConical size={17} />}
              label="Grammar"
              color="blue"
              size="small"
            />
          </div>

          <LearningCategoryStrip
            categories={categories}
            selectedCategories={selectedCategories}
            onOpenFilters={() => onFiltersOpenChange(true)}
          />

          <LearningSystemMenu
            isOpen={learningSystemOpen}
            onToggle={() => setLearningSystemOpen((open) => !open)}
          />
        </header>

        <section className="flex min-h-0 flex-col gap-3">
        <div className="relative flex min-h-[520px] items-start justify-center">
          {nextCard && (
            <div className="absolute inset-x-0 top-0 w-full scale-90 opacity-20 pointer-events-none blur-sm -z-10">
              <div className={`bg-white ${UI_RADIUS.surface} shadow-xl overflow-hidden border border-gray-200`}>
                <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                  {nextCard.image_base64 ? (
                    <img src={`data:image/jpeg;base64,${nextCard.image_base64}`} alt={nextCard.word} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                      <span className="text-4xl font-bold text-indigo-300">{nextCard.word.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="p-6 text-center">
                  <h2 className="text-4xl font-bold text-gray-900">{nextCard.word}</h2>
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
            <SurfacePanel className="w-full border-dashed border-slate-300 bg-white/80 text-center" padding="lg">
              <h2 className="text-2xl font-extrabold text-slate-900">No cards in this deck</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Open filters and select at least one category.
              </p>
              <button
                onClick={() => onFiltersOpenChange(true)}
                className={`mt-5 ${UI_RADIUS.control} bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white`}
              >
                Open Filters
              </button>
            </SurfacePanel>
          )}
        </div>

        <SwipeButtons onSwipe={handleDirectionalSwipe} disabled={!currentCard} />

        <ProgressBar progress={progress} totalCards={totalCards} />

        <div className="pb-2 text-center text-sm font-medium text-slate-500">
          Swipe left: Don't know · Swipe right: Know
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
  );
}
