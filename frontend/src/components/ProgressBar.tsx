import type { UserProgress } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ProgressBarProps {
  progress: UserProgress;
  totalCards: number;
}

export const ProgressBar = ({ progress, totalCards }: ProgressBarProps) => {
  const percentage = totalCards > 0 ? (progress.cards_reviewed / totalCards) * 100 : 0;

  return (
    <div className="w-full bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-gray-100">
      <div className="flex justify-between text-sm font-semibold text-gray-700 mb-3">
        <span>Progress: {progress.cards_reviewed} / {totalCards}</span>
        <span className="text-indigo-600">{Math.round(percentage)}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500 rounded-full shadow-md"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-5 text-sm">
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm"></div>
          <span className="font-semibold text-green-700">Known: {progress.known_count}</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-full">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-pink-600 shadow-sm"></div>
          <span className="font-semibold text-red-700">Unknown: {progress.unknown_count}</span>
        </div>
      </div>
    </div>
  );
};
