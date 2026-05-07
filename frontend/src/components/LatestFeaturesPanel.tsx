import { Sparkles } from 'lucide-react';
import { UI_RADIUS, UI_SIZE } from './ui';

const latestFeatureItems = [
  'The home screen now starts from the 400-level German path.',
  'Cards show a 1-to-10 word mastery badge, separate from the global path level.',
  'After each swipe, the session can show level-up feedback before the next card.',
  'The visible topic filters stay inside the swipe experience, so the deck can change without leaving the game.',
];

export function LatestFeaturesPanel() {
  return (
    <section
      id="latest-learning-features"
      className={`${UI_RADIUS.control} border border-indigo-200 bg-indigo-50 p-3 shadow-inner dark:border-indigo-800 dark:bg-indigo-950/40`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex ${UI_SIZE.smallIcon} shrink-0 items-center justify-center ${UI_RADIUS.control} bg-white text-indigo-600 ring-1 ring-indigo-100 dark:bg-slate-900 dark:text-indigo-200 dark:ring-indigo-800`}>
          <Sparkles size={16} />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">New Features / Nuove feature</h3>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Latest session updates</p>
        </div>
      </div>
      <ul className="mt-2 grid gap-1.5 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
        {latestFeatureItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
