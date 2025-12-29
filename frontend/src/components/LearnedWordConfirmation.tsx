import { CheckCircle, X } from 'lucide-react';

interface LearnedWordConfirmationProps {
  word: string;
  translation: string;
  onConfirm: () => void;
  onSkip: () => void;
}

export function LearnedWordConfirmation({
  word,
  translation,
  onConfirm,
  onSkip,
}: LearnedWordConfirmationProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Did you learn this word?
          </h2>
          <p className="text-gray-600">
            After watching the videos, do you want to add this word to your known words?
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{word}</h3>
            <p className="text-lg text-gray-600">{translation}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap min-w-fit"
          >
            <X size={20} />
            <span>Not yet</span>
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap min-w-fit"
          >
            <CheckCircle size={20} />
            <span>Yes, I know it!</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          The word will be saved in the database as learned
        </p>
      </div>
    </div>
  );
}
