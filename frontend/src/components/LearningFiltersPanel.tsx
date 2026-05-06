import { Check, Trophy, X } from 'lucide-react';
import { getLearningCategoryMeta } from './learningCategoryMeta';
import { UI_ELEVATION, UI_RADIUS, UI_SIZE } from './ui';

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-3 pb-3 backdrop-blur-sm sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-filters-title"
        className={`w-full max-w-lg ${UI_RADIUS.surface} border border-slate-200 bg-white p-4 shadow-2xl sm:p-5`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-indigo-600">
              <Trophy size={16} />
              Game packs
            </div>
            <h2 id="learning-filters-title" className="text-2xl font-black text-slate-900">Build your topic deck</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              Pick the packs you want in the swipe deck. Apply categories without leaving the deck.
            </p>
          </div>
          <button
            onClick={onClose}
            className={`flex ${UI_SIZE.iconButton} items-center justify-center ${UI_RADIUS.touchIcon} border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900`}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <div className={`mb-4 flex items-center justify-between gap-3 ${UI_RADIUS.surface} bg-slate-950 px-4 py-3 text-white`}>
          <div>
            <div className="text-xs font-black uppercase text-white/50">Selected packs</div>
            <div className="text-2xl font-black">
              {selectedCategories.length}
              <span className="text-base text-white/60"> / {categories.length}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className={`${UI_RADIUS.control} bg-white px-4 py-2 text-sm font-black text-slate-900 transition hover:bg-indigo-50 active:scale-95`}
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              className={`${UI_RADIUS.control} border border-white/25 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15 active:scale-95`}
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
                className={`relative min-h-[128px] min-w-0 overflow-hidden ${UI_RADIUS.surface} border p-3 text-left ${UI_ELEVATION.surface} transition hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
                  selected
                    ? `bg-gradient-to-br ${meta.gradientClass} border-transparent text-white ${UI_ELEVATION.floating}`
                    : `${meta.softClass} ${meta.borderClass} text-slate-800`
                }`}
              >
                <span className={`mb-3 flex ${UI_SIZE.iconButton} items-center justify-center ${UI_RADIUS.control} ${
                  selected ? 'bg-white/20 text-white' : `bg-white ${meta.textClass}`
                }`}>
                  <Icon size={20} />
                </span>
                <span className="block text-base font-black leading-5">{meta.label}</span>
                <span className={`mt-1 block text-xs font-bold leading-5 ${
                  selected ? 'text-white/75' : 'text-slate-500'
                }`}>
                  {meta.description}
                </span>
                {selected && (
                  <span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center ${UI_RADIUS.pill} bg-white text-slate-900`}>
                    <Check size={17} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className={`mt-5 w-full ${UI_RADIUS.control} bg-slate-900 px-5 py-4 text-base font-black text-white shadow-xl shadow-slate-200 transition hover:bg-slate-800 active:scale-[0.99]`}
        >
          Apply Filters
        </button>
      </section>
    </div>
  );
}
