import type { UserProgress } from '../types';
import { SurfacePanel, UI_RADIUS } from './ui';

interface ProgressBarProps {
  progress: UserProgress;
  totalCards: number;
}

export const ProgressBar = ({ progress, totalCards }: ProgressBarProps) => {
  const percentage = totalCards > 0 ? (progress.cards_reviewed / totalCards) * 100 : 0;

  return (
    <SurfacePanel className="w-full" padding="lg">
      <div className="flex justify-between text-sm font-semibold text-body mb-3">
        <span>Progress: {progress.cards_reviewed} / {totalCards}</span>
        <span className="text-primary">{Math.round(percentage)}%</span>
      </div>

      <div className={`w-full bg-surface-soft ${UI_RADIUS.pill} h-4 overflow-hidden`}>
        <div
          className={`bg-primary h-full transition-all duration-500 ${UI_RADIUS.pill}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-5 text-sm">
        <div className={`flex items-center gap-2 bg-success/10 px-3 py-2 ${UI_RADIUS.pill}`}>
          <div className={`w-3 h-3 ${UI_RADIUS.pill} bg-success`} />
          <span className="font-semibold text-success">Known: {progress.known_count}</span>
        </div>
        <div className={`flex items-center gap-2 bg-error/10 px-3 py-2 ${UI_RADIUS.pill}`}>
          <div className={`w-3 h-3 ${UI_RADIUS.pill} bg-error`} />
          <span className="font-semibold text-error">Unknown: {progress.unknown_count}</span>
        </div>
      </div>
    </SurfacePanel>
  );
};
