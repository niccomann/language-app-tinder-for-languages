import { Gauge, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { AdaptiveFlashcard } from '../types';
import { UI_RADIUS } from './ui';

type SelectionReason = AdaptiveFlashcard['selection_reason'];

interface WordMasteryBadgeProps {
  level: number;
  confidenceScore: number;
  selectionReason: SelectionReason;
  compact?: boolean;
}

const reasonMeta: Record<SelectionReason, { label: string; Icon: typeof Target; className: string }> = {
  new: {
    label: 'New',
    Icon: Sparkles,
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  struggling: {
    label: 'Struggling',
    Icon: Target,
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  learning: {
    label: 'Learning',
    Icon: TrendingUp,
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  review: {
    label: 'Review',
    Icon: Gauge,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

export function WordMasteryBadge({
  level,
  confidenceScore,
  selectionReason,
  compact = false,
}: WordMasteryBadgeProps) {
  const meta = reasonMeta[selectionReason];
  const Icon = meta.Icon;

  return (
    <div className={`${UI_RADIUS.control} border ${meta.className} shadow-sm backdrop-blur-md ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="flex items-center gap-2">
        <Icon size={compact ? 14 : 16} />
        <span className="text-xs font-extrabold uppercase tracking-wide">{meta.label}</span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <span className={`${compact ? 'text-lg' : 'text-2xl'} font-extrabold leading-none`}>
          Mastery {level}
        </span>
        <span className="text-xs font-bold opacity-80">/10</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-current"
          style={{ width: `${Math.max(0, Math.min(100, confidenceScore))}%` }}
        />
      </div>
    </div>
  );
}
