import type { WordCloudItem } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  animals: '#3B82F6',
  food: '#10B981',
  verbs: '#EF4444',
  adjectives: '#F59E0B',
  objects: '#8B5CF6',
  default: '#64748B',
};

interface WordDetailModalProps {
  word: WordCloudItem;
  onClose: () => void;
}

export function WordDetailModal({ word, onClose }: WordDetailModalProps) {
  const totalSwipes = (word.swipe_right_count || 0) + (word.swipe_left_count || 0);
  const masteryPercentage = totalSwipes > 0 
    ? Math.round(((word.swipe_right_count || 0) / totalSwipes) * 100) 
    : 0;

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {word.image_url && (
          <div className="h-48 overflow-hidden">
            <img 
              src={word.image_url} 
              alt={word.text}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-gray-800">{word.text}</h2>
            {word.category && (
              <span 
                className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                style={{ backgroundColor: CATEGORY_COLORS[word.category] || CATEGORY_COLORS.default }}
              >
                {word.category}
              </span>
            )}
          </div>
          
          <p className="text-xl text-gray-600 mb-6">{word.translation}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {word.swipe_right_count || 0}
              </div>
              <div className="text-xs text-green-700">Times known</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {word.swipe_left_count || 0}
              </div>
              <div className="text-xs text-red-700">Times not known</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {word.review_count || 0}
              </div>
              <div className="text-xs text-blue-700">Total reviews</div>
            </div>
          </div>
          
          {totalSwipes > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Mastery level</span>
                <span className="font-semibold text-gray-800">{masteryPercentage}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:scale-[1.02] transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
