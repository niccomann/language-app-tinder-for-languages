import { Sparkles } from 'lucide-react';
import { usePathDifficulty } from '../hooks/usePathDifficulty';
import { UI_RADIUS } from './ui';

export function PathStatusBadge() {
  const difficulty = usePathDifficulty();

  return (
    <div
      aria-label={`Path level ${difficulty.pathLevel}, ${difficulty.currentCefrLevel}`}
      className={`${UI_RADIUS.pill} inline-flex min-h-10 items-center gap-1.5 border border-hairline bg-canvas/95 px-3 text-caption font-black text-ink shadow-sm backdrop-blur-sm`}
    >
      <Sparkles size={14} className="text-primary" aria-hidden />
      <span>Lv {difficulty.pathLevel} · {difficulty.currentCefrLevel}</span>
    </div>
  );
}
