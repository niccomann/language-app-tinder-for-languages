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
    className: 'border-hairline bg-surface-card text-muted',
  },
  struggling: {
    label: 'Struggling',
    Icon: Target,
    className: 'border-hairline bg-surface-card text-error',
  },
  learning: {
    label: 'Learning',
    Icon: TrendingUp,
    className: 'border-hairline bg-surface-card text-ink',
  },
  review: {
    label: 'Review',
    Icon: Gauge,
    className: 'border-hairline bg-success text-on-primary',
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
    <div className={`${UI_RADIUS.control} border ${meta.className} ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="flex items-center gap-2">
        <Icon size={compact ? 14 : 16} />
        <span className="text-xs font-medium uppercase tracking-wide">{meta.label}</span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <span className={`${compact ? 'text-lg' : 'text-2xl'} font-semibold leading-none`}>
          Mastery {level}
        </span>
        <span className="text-xs font-medium opacity-80">/10</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas/80">
        <div
          className="h-full rounded-full bg-current"
          style={{ width: `${Math.max(0, Math.min(100, confidenceScore))}%` }}
        />
      </div>
    </div>
  );
}
