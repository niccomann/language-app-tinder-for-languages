import { SlidersHorizontal } from 'lucide-react';
import { SurfacePanel, UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';

interface LearningCategoryStripProps {
  categories: string[];
  selectedCategories: string[];
  onOpenFilters: () => void;
}

export function LearningCategoryStrip({
  categories,
  selectedCategories,
  onOpenFilters,
}: LearningCategoryStripProps) {
  const copy = useCopy();
  const active = selectedCategories.length || 0;
  const total = categories.length || 0;

  return (
    <SurfacePanel padding="sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="font-display text-title-sm font-semibold text-ink leading-none">
            {active}
            <span className="text-muted">/{total}</span>
          </span>
          <span className="text-caption-uppercase tracking-[1.5px] text-muted uppercase truncate">
            {copy.learningStrip.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={copy.learningStrip.changeFilters}
          className={`flex shrink-0 items-center gap-1.5 ${UI_RADIUS.control} bg-ink px-3 py-1.5 text-caption font-medium text-canvas transition hover:bg-body-strong`}
        >
          <SlidersHorizontal size={13} />
          {copy.learningStrip.changeFilters}
        </button>
      </div>
    </SurfacePanel>
  );
}
