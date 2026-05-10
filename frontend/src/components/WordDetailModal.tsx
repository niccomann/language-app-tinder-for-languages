import type { WordCloudItem } from '../types';
import { AudioButton } from './AudioButton';
import { ConfidenceBadge } from './ConfidenceBadge';
import { UI_RADIUS } from './ui';
import { CATEGORY_COLORS } from '../utils/wordDisplayMeta';

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
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`bg-canvas ${UI_RADIUS.surface} border border-hairline max-w-md w-full mx-4 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {word.image_base64 && (
          <div className="h-48 overflow-hidden">
            <img
              src={`data:image/jpeg;base64,${word.image_base64}`}
              alt={word.text}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-ink">{word.text}</h2>
              <AudioButton text={word.text} size="md" />
            </div>
            {word.category && (
              <span
                className={`px-3 py-1 ${UI_RADIUS.pill} text-xs font-semibold text-on-primary capitalize`}
                style={{ backgroundColor: CATEGORY_COLORS[word.category] || CATEGORY_COLORS.default }}
              >
                {word.category}
              </span>
            )}
          </div>

          <p className="text-xl text-body mb-4">{word.translation}</p>

          <div className="mb-6">
            <ConfidenceBadge word={word.text} size="md" />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`bg-success/10 ${UI_RADIUS.control} p-4 text-center`}>
              <div className="text-2xl font-bold text-success">
                {word.swipe_right_count || 0}
              </div>
              <div className="text-xs text-success">Times known</div>
            </div>
            <div className={`bg-error/10 ${UI_RADIUS.control} p-4 text-center`}>
              <div className="text-2xl font-bold text-error">
                {word.swipe_left_count || 0}
              </div>
              <div className="text-xs text-error">Times not known</div>
            </div>
            <div className={`bg-surface-soft ${UI_RADIUS.control} p-4 text-center`}>
              <div className="text-2xl font-bold text-primary">
                {word.review_count || 0}
              </div>
              <div className="text-xs text-muted">Total reviews</div>
            </div>
          </div>

          {totalSwipes > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Mastery level</span>
                <span className="font-semibold text-ink">{masteryPercentage}%</span>
              </div>
              <div className={`h-3 bg-surface-soft ${UI_RADIUS.pill} overflow-hidden`}>
                <div
                  className={`h-full bg-success ${UI_RADIUS.pill} transition-all duration-500`}
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 bg-primary text-on-primary ${UI_RADIUS.control} font-semibold hover:bg-primary-active transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
