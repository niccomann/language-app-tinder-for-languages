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
    title: 'Mastery score',
    text: 'Each swipe updates a mastery score from 1 to 10.',
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
    <section className={`${UI_RADIUS.surface} border border-indigo-100 bg-white/90 p-3 shadow-sm`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="learning-system-menu"
        className={`flex min-h-12 w-full items-center justify-between gap-3 ${UI_RADIUS.control} px-1 text-left transition hover:bg-indigo-50/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${UI_RADIUS.control} bg-indigo-600 text-white shadow-md shadow-indigo-200`}>
            <Brain size={19} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-slate-900">Learning System</span>
            <span className="block text-xs font-semibold leading-5 text-slate-500">
              Your swipes shape the next difficulty.
            </span>
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div id="learning-system-menu" className="mt-3 grid gap-2">
          {learningSystemItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`flex gap-3 ${UI_RADIUS.control} bg-slate-50 p-3`}>
                <span className={`mt-0.5 flex ${UI_SIZE.smallIcon} shrink-0 items-center justify-center ${UI_RADIUS.control} bg-white text-indigo-600 ring-1 ring-indigo-100`}>
                  <Icon size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
