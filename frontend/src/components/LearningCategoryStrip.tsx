import { SlidersHorizontal } from 'lucide-react';
import { getLearningCategoryMeta } from './learningCategoryMeta';
import { SurfacePanel, UI_RADIUS } from './ui';

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
  const visibleCategories = selectedCategories.length > 0 ? selectedCategories.slice(0, 4) : categories.slice(0, 4);
  const hiddenCount = Math.max((selectedCategories.length || categories.length) - visibleCategories.length, 0);

  return (
    <SurfacePanel padding="sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-caption-uppercase tracking-[1.5px] text-muted uppercase">Game packs</div>
          <h2 className="font-sans font-semibold text-title-sm text-ink">Topic Deck</h2>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label="Edit topic filters"
          className={`flex min-h-10 shrink-0 items-center gap-2 ${UI_RADIUS.control} bg-ink px-4 py-2 text-body-sm font-medium text-canvas transition hover:bg-body-strong`}
        >
          <SlidersHorizontal size={16} />
          Edit
        </button>
      </div>

      <div className={`mb-3 flex items-center justify-between ${UI_RADIUS.control} bg-surface-card px-3 py-2`}>
        <span className="text-body-sm font-medium text-body-strong">
          {selectedCategories.length || 0} / {categories.length || 0} active
        </span>
        <span className={`${UI_RADIUS.pill} bg-canvas px-2.5 py-1 text-caption font-medium text-primary border border-hairline`}>
          Swipe deck
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleCategories.length > 0 ? (
          visibleCategories.map((category, index) => {
            const meta = getLearningCategoryMeta(category, index);
            const Icon = meta.Icon;
            const selected = selectedCategories.includes(category);

            return (
              <button
                type="button"
                key={category}
                onClick={onOpenFilters}
                aria-pressed={selected}
                className={`flex min-h-[82px] min-w-0 items-center gap-3 ${UI_RADIUS.control} border p-3 text-left transition ${
                  selected ? `${meta.softClass} ${meta.borderClass}` : 'border-hairline bg-canvas hover:bg-surface-card'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${UI_RADIUS.control} bg-ink text-canvas`}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold leading-4 text-ink">{meta.label}</span>
                  <span className={`mt-1 block text-caption font-medium leading-4 ${selected ? meta.textClass : 'text-muted'}`}>
                    {selected ? 'Active pack' : 'Tap to add'}
                  </span>
                </span>
              </button>
            );
          })
        ) : (
          <button
            type="button"
            onClick={onOpenFilters}
            className={`w-full ${UI_RADIUS.control} border border-hairline bg-surface-card px-4 py-3 text-body-sm font-medium text-accent-amber`}
          >
            Select at least one topic pack to build a deck.
          </button>
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={onOpenFilters}
            className={`flex min-h-[82px] min-w-0 items-center justify-center ${UI_RADIUS.control} border border-dashed border-hairline bg-surface-card p-3 text-center text-body-sm font-medium text-muted transition hover:bg-surface-cream-strong hover:text-ink`}
          >
            +{hiddenCount} more packs
          </button>
        )}
      </div>
    </SurfacePanel>
  );
}
