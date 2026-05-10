import { Brain, ChevronDown, Database, Gauge, Layers } from 'lucide-react';
import { UI_RADIUS, UI_SIZE } from './ui';

const learningSystemItems = [
  {
    icon: Database,
    title: 'Unified word memory',
    text: 'One memory database tracks every word you know, miss, or are still learning.',
  },
  {
    icon: Gauge,
    title: '400-level path',
    text: 'Your global path can grow through 400 levels.',
  },
  {
    icon: Gauge,
    title: 'Word mastery',
    text: 'Each word still has a focused mastery score from 1 to 10.',
  },
  {
    icon: Layers,
    title: 'Context difficulty',
    text: 'Future sentences can mix strong words with weaker words, keeping context useful without overload.',
  },
];

interface LearningSystemMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function LearningSystemMenu({ isOpen, onToggle }: LearningSystemMenuProps) {
  return (
    <section className={`${UI_RADIUS.surface} border border-hairline bg-canvas p-3`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="learning-system-menu"
        className={`flex min-h-12 w-full items-center justify-between gap-3 ${UI_RADIUS.control} px-1 text-left transition hover:bg-surface-cream-strong focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${UI_RADIUS.control} bg-primary text-on-primary`}>
            <Brain size={19} />
          </span>
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-ink">Learning System</span>
            <span className="block text-caption font-medium leading-5 text-muted">
              Your swipes shape the next difficulty.
            </span>
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div id="learning-system-menu" className="mt-3 grid gap-2">
          {learningSystemItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`flex gap-3 ${UI_RADIUS.control} bg-surface-card p-3`}>
                <span className={`mt-0.5 flex ${UI_SIZE.smallIcon} shrink-0 items-center justify-center ${UI_RADIUS.control} bg-canvas text-primary border border-hairline`}>
                  <Icon size={17} />
                </span>
                <div>
                  <h3 className="text-body-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-body-sm font-medium leading-6 text-muted">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
