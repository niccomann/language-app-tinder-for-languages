import { SlidersHorizontal } from 'lucide-react';
import { getLearningCategoryMeta } from './learningCategoryMeta';
import { SurfacePanel, UI_ELEVATION, UI_RADIUS } from './ui';

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
          <div className="text-xs font-black uppercase text-slate-400">Game packs</div>
          <h2 className="text-lg font-black text-slate-900">Topic Deck</h2>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label="Edit topic filters"
          className={`flex min-h-11 shrink-0 items-center gap-2 ${UI_RADIUS.control} bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 active:scale-95`}
        >
          <SlidersHorizontal size={16} />
          Edit
        </button>
      </div>

      <div className={`mb-3 flex items-center justify-between ${UI_RADIUS.control} bg-slate-50 px-3 py-2`}>
        <span className="text-sm font-extrabold text-slate-700">
          {selectedCategories.length || 0} / {categories.length || 0} active
        </span>
        <span className={`${UI_RADIUS.pill} bg-white px-2.5 py-1 text-xs font-black uppercase text-indigo-600 ring-1 ring-indigo-100`}>
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
                className={`flex min-h-[82px] min-w-0 items-center gap-3 ${UI_RADIUS.control} border p-3 text-left ${UI_ELEVATION.surface} transition hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
                  selected ? `${meta.softClass} ${meta.borderClass}` : 'border-slate-200 bg-white'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${UI_RADIUS.control} bg-gradient-to-br ${meta.gradientClass} text-white shadow-md`}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-4 text-slate-900">{meta.label}</span>
                  <span className={`mt-1 block text-xs font-bold leading-4 ${selected ? meta.textClass : 'text-slate-500'}`}>
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
            className={`w-full ${UI_RADIUS.control} border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800`}
          >
            Select at least one topic pack to build a deck.
          </button>
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={onOpenFilters}
            className={`flex min-h-[82px] min-w-0 items-center justify-center ${UI_RADIUS.control} border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm font-black text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95`}
          >
            +{hiddenCount} more packs
          </button>
        )}
      </div>
    </SurfacePanel>
  );
}
