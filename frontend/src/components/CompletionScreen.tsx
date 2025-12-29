import { RotateCcw, BookOpen } from 'lucide-react';
import { StatCard } from './ui';

interface CompletionScreenProps {
  progress: {
    cards_reviewed: number;
    known_count: number;
    unknown_count: number;
  };
  onRestart: () => void;
  onChangeCategories: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
}

export function CompletionScreen({
  progress,
  onRestart,
  onChangeCategories,
  onOpenLibrary,
  onOpenGrammarLab,
}: CompletionScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center max-w-lg">
        <div className="text-8xl mb-6 animate-bounce">🎉</div>
        <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Excellent Work!
        </h2>
        <p className="text-xl text-gray-600 mb-10">
          You've completed all flashcards in this session
        </p>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100 p-8 mb-10">
          <div className="grid grid-cols-3 gap-6">
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl">
              <div className="text-4xl font-extrabold text-indigo-600 mb-1">
                {progress.cards_reviewed}
              </div>
              <div className="text-sm font-semibold text-gray-700">Reviewed</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
              <div className="text-4xl font-extrabold text-green-600 mb-1">
                {progress.known_count}
              </div>
              <div className="text-sm font-semibold text-gray-700">Known</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl">
              <div className="text-4xl font-extrabold text-red-600 mb-1">
                {progress.unknown_count}
              </div>
              <div className="text-sm font-semibold text-gray-700">To Review</div>
            </div>
          </div>
        </div>

        <div className="flex gap-5 justify-center flex-wrap">
          <button
            onClick={onRestart}
            className="flex items-center gap-3 px-14 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl font-extrabold text-lg hover:shadow-2xl transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 whitespace-nowrap min-w-fit"
          >
            <RotateCcw size={24} strokeWidth={2.5} />
            <span>Start Over</span>
          </button>
          <button
            onClick={onChangeCategories}
            className="flex items-center gap-3 px-14 py-5 bg-white text-gray-700 border-2 border-gray-300 rounded-2xl font-extrabold text-lg hover:border-indigo-400 hover:shadow-xl hover:text-indigo-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap min-w-fit"
          >
            <span>📋</span>
            <span>Change Categories</span>
          </button>
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-3 px-14 py-5 bg-white text-purple-700 border-2 border-purple-300 rounded-2xl font-extrabold text-lg hover:border-purple-400 hover:shadow-xl hover:text-purple-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap min-w-fit"
          >
            <BookOpen size={24} strokeWidth={2.5} />
            <span>View Library</span>
          </button>
          <button
            onClick={onOpenGrammarLab}
            className="flex items-center gap-3 px-14 py-5 bg-white text-blue-700 border-2 border-blue-300 rounded-2xl font-extrabold text-lg hover:border-blue-400 hover:shadow-xl hover:text-blue-600 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap min-w-fit"
          >
            <span>🧪</span>
            <span>Grammar Lab</span>
          </button>
        </div>
      </div>
    </div>
  );
}
