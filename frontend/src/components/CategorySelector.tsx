import { Check } from 'lucide-react';

interface CategorySelectorProps {
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onStart: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  animals: '🦁',
  food: '🍎',
  objects: '📱',
  actions: '🏃',
  nature: '🌳',
  colors: '🎨',
  body: '👤',
  weather: '☁️',
  clothing: '👕',
  transportation: '🚗',
  family: '👨‍👩‍👧',
  time: '⏰',
  music: '🎵',
  sports: '⚽',
  places: '🏙️',
};

const BASE_BUTTON_CLASSES = 'px-10 py-4 text-base font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95';

export const CategorySelector = ({
  categories,
  selectedCategories,
  onToggleCategory,
  onStart,
  onSelectAll,
  onDeselectAll,
}: CategorySelectorProps) => {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Learn German
          </h1>
          <p className="text-lg text-gray-600 px-4">
            Choose your learning path
          </p>
        </div>

        <div className="flex gap-5 justify-center mb-8">
          <button onClick={onSelectAll} className={`${BASE_BUTTON_CLASSES} bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700`}>
            <span className="flex items-center gap-4">
              <span className="text-xl">✓</span>
              <span>Select All</span>
            </span>
          </button>
          <button onClick={onDeselectAll} className={`${BASE_BUTTON_CLASSES} bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50`}>
            <span className="flex items-center gap-4">
              <span className="text-xl">✕</span>
              <span>Deselect All</span>
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {categories.map((category) => {
            const isSelected = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => onToggleCategory(category)}
                className={`
                  relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-105
                  ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200 border-2 border-indigo-400'
                      : 'bg-white border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-center gap-5 px-2">
                  <span className="text-4xl filter drop-shadow-md flex-shrink-0">
                    {CATEGORY_EMOJIS[category] || '📚'}
                  </span>
                  <span className={`text-lg font-extrabold capitalize tracking-wide ${
                    isSelected ? 'text-white' : 'text-gray-800'
                  }`}>
                    {category}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Check size={18} className="text-indigo-600" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full">
            <span className="text-gray-700 font-medium">Selected:</span>
            <span className="text-xl font-bold text-indigo-600">{selectedCategories.length}</span>
            <span className="text-gray-500">/ {categories.length}</span>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={selectedCategories.length === 0}
          className={`w-full py-6 px-8 rounded-2xl font-extrabold text-xl tracking-wide transition-all duration-300 transform ${
            selectedCategories.length > 0
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl hover:scale-[1.03] active:scale-[0.97]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
          }`}
        >
          {selectedCategories.length > 0
            ? `🚀 Start Learning · ${selectedCategories.length} ${selectedCategories.length === 1 ? 'Category' : 'Categories'}`
            : '⚠️ Select at least one category'}
        </button>
      </div>
    </div>
  );
};
