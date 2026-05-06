import { Check, BookOpen } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CategorySelectorProps {
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  onStart: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
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
  verbs: '✍️',
  adjectives: '⭐',
};

const BASE_BUTTON_CLASSES = 'px-10 py-4 text-base font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 whitespace-nowrap flex-shrink-0';

export const CategorySelector = ({
  categories,
  selectedCategories,
  onToggleCategory,
  onStart,
  onSelectAll,
  onDeselectAll,
  onOpenLibrary,
  onOpenGrammarLab,
}: CategorySelectorProps) => {
  const { isDark } = useTheme();

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-6 transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'}`}>
      <div className={`w-full max-w-5xl backdrop-blur-sm rounded-3xl shadow-xl border p-8 transition-colors duration-300 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-100'}`}>
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Learn German
          </h1>
          <p className={`text-lg px-4 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            You only decide: know it or not yet. The algorithm adapts the learning path from there.
          </p>
        </div>

        <div className="flex gap-5 justify-center mb-8 flex-wrap">
          <button onClick={onSelectAll} className={`${BASE_BUTTON_CLASSES} bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700`}>
            <span className="flex items-center gap-4">
              <span className="text-xl">✓</span>
              <span>Select All</span>
            </span>
          </button>
          <button onClick={onDeselectAll} className={`${BASE_BUTTON_CLASSES} ${isDark ? 'bg-slate-700 text-slate-200 border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-600' : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}>
            <span className="flex items-center gap-4">
              <span className="text-xl">✕</span>
              <span>Deselect All</span>
            </span>
          </button>
          <button onClick={onOpenLibrary} className={`${BASE_BUTTON_CLASSES} bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700`}>
            <span className="flex items-center gap-4">
              <BookOpen size={20} />
              <span>View Library</span>
            </span>
          </button>
          <button onClick={onOpenGrammarLab} className={`${BASE_BUTTON_CLASSES} bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700`}>
            <span className="flex items-center gap-4">
              <span>🧪</span>
              <span>Grammar Lab</span>
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
                      : isDark ? 'bg-slate-700 border-2 border-slate-600 hover:border-indigo-400 hover:shadow-md' : 'bg-white border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-center gap-5 px-2">
                  <span className="text-4xl filter drop-shadow-md flex-shrink-0">
                    {CATEGORY_EMOJIS[category] || '📚'}
                  </span>
                  <span className={`text-lg font-extrabold capitalize tracking-wide ${
                    isSelected ? 'text-white' : isDark ? 'text-slate-200' : 'text-gray-800'
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
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-indigo-50'}`}>
            <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Selected:</span>
            <span className="text-xl font-bold text-indigo-500">{selectedCategories.length}</span>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>/ {categories.length}</span>
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
