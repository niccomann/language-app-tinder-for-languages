import { Check, Trophy, X } from 'lucide-react';
import { getLearningCategoryMeta } from './learningCategoryMeta';
import { UI_RADIUS, UI_SIZE } from './ui';

interface LearningFiltersPanelProps {
  isOpen: boolean;
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
}

export function LearningFiltersPanel({
  isOpen,
  categories,
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
  onClose,
}: LearningFiltersPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-3 pb-3 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-filters-title"
        className={`w-full max-w-lg ${UI_RADIUS.surface} border border-hairline bg-canvas p-4 sm:p-5`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-caption-uppercase tracking-[1.5px] text-primary uppercase">
              <Trophy size={16} />
              Game packs
            </div>
            <h2 id="learning-filters-title" className="font-display font-normal text-display-sm tracking-[-0.5px] text-ink">Build your topic deck</h2>
            <p className="mt-1 text-body-sm font-medium leading-6 text-muted">
              Pick the packs you want in the swipe deck. Apply categories without leaving the deck.
            </p>
          </div>
          <button
            onClick={onClose}
            className={`flex ${UI_SIZE.iconButton} items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline text-muted transition hover:bg-surface-card hover:text-ink`}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <div className={`mb-4 flex items-center justify-between gap-3 ${UI_RADIUS.surface} bg-ink px-4 py-3 text-canvas`}>
          <div>
            <div className="text-caption-uppercase tracking-[1.5px] text-canvas/50 uppercase">Selected packs</div>
            <div className="font-display font-normal text-display-sm text-canvas">
              {selectedCategories.length}
              <span className="text-body-md text-canvas/60"> / {categories.length}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className={`${UI_RADIUS.control} bg-canvas px-4 py-2 text-body-sm font-medium text-ink transition hover:bg-surface-card`}
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              className={`${UI_RADIUS.control} border border-canvas/25 bg-canvas/10 px-4 py-2 text-body-sm font-medium text-canvas transition hover:bg-canvas/15`}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid max-h-[52dvh] grid-cols-2 gap-3 overflow-y-auto pr-1">
          {categories.map((category, index) => {
            const selected = selectedCategories.includes(category);
            const meta = getLearningCategoryMeta(category, index);
            const Icon = meta.Icon;

            return (
              <button
                key={category}
                onClick={() => onToggleCategory(category)}
                aria-pressed={selected}
                className={`relative min-h-[128px] min-w-0 overflow-hidden ${UI_RADIUS.surface} border p-3 text-left transition ${
                  selected
                    ? `bg-primary border-transparent text-on-primary`
                    : `${meta.softClass} ${meta.borderClass} text-ink`
                }`}
              >
                <span className={`mb-3 flex ${UI_SIZE.iconButton} items-center justify-center ${UI_RADIUS.control} ${
                  selected ? 'bg-canvas/20 text-on-primary' : `bg-canvas ${meta.textClass}`
                }`}>
                  <Icon size={20} />
                </span>
                <span className="block text-body-md font-semibold leading-5">{meta.label}</span>
                <span className={`mt-1 block text-caption font-medium leading-5 ${
                  selected ? 'text-on-primary/75' : 'text-muted'
                }`}>
                  {meta.description}
                </span>
                {selected && (
                  <span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center ${UI_RADIUS.pill} bg-canvas text-ink`}>
                    <Check size={17} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className={`mt-5 w-full ${UI_RADIUS.control} bg-ink px-5 py-4 text-body-md font-semibold text-canvas transition hover:bg-body-strong`}
        >
          Apply Filters
        </button>
      </section>
    </div>
  );
}
