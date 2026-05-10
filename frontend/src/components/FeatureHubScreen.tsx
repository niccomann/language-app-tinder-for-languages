import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, BookOpenCheck, Compass, FlaskConical, Layers3, Puzzle, Route, ShieldCheck, Sparkles } from 'lucide-react';
import { AppScreen, ScreenHeader, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import {
  getFeatureFlowItemsByPhase,
  type FeatureFlowItem,
  type FeatureFlowTone,
} from '../gamification/featureFlowRegistry';

type FeatureHubKind = 'review' | 'explore';

interface FeatureHubScreenProps {
  kind: FeatureHubKind;
  selectedCategoriesCount: number;
  categoriesCount: number;
  onBack: () => void;
  onNavigateToFeature: (path: string) => void;
}

interface HubSection {
  title: string;
  body: string;
  items: FeatureFlowItem[];
}

const grammarTrainingIds = new Set(['sentence-placement', 'grammar-lab', 'build-sentence', 'compose-sentence']);

export function FeatureHubScreen({
  kind,
  selectedCategoriesCount,
  categoriesCount,
  onBack,
  onNavigateToFeature,
}: FeatureHubScreenProps) {
  const collectionItems = getFeatureFlowItemsByPhase('collection');
  const upcomingItems = getFeatureFlowItemsByPhase('upcoming');
  const advancedItems = getFeatureFlowItemsByPhase('advanced');
  const grammarTrainingItems = [
    ...upcomingItems,
    ...advancedItems.filter((item) => grammarTrainingIds.has(item.id)),
  ];
  const languageMapItems = advancedItems.filter((item) => !grammarTrainingIds.has(item.id));
  const sections: HubSection[] = kind === 'review'
    ? [{
      title: 'Review & setup',
      body: 'Adjust the deck, inspect known words, open the library, or review how the learning system scores memory.',
      items: collectionItems,
    }]
    : [
      {
        title: 'Grammar training',
        body: 'Use these when the path needs sentence logic, grammar practice, or builder tools.',
        items: grammarTrainingItems,
      },
      {
        title: 'Language map',
        body: 'Explore relationships, clusters, dialects, and hierarchy when you want to inspect the system.',
        items: languageMapItems,
      },
    ];
  const title = kind === 'review' ? 'Review & Setup' : 'Explore German';
  const subtitle = kind === 'review'
    ? `Tools are grouped here so the path can stay focused. Topics ${selectedCategoriesCount}/${categoriesCount || 0} are active.`
    : 'Advanced grammar and language-map tools stay available without crowding the daily path.';

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 pb-4 pt-24 md:pt-20">
      <main className="mx-auto w-full max-w-5xl space-y-4">
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          density="compact"
          actions={(
            <button
              type="button"
              onClick={onBack}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-11 items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`}
            >
              <ArrowLeft size={17} />
              Path
            </button>
          )}
        />

        <div className="grid gap-4">
          {sections.map((section) => (
            <SurfacePanel key={section.title} padding="lg" className="space-y-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-500 dark:text-indigo-200">
                  {section.title}
                </p>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                  {section.body}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {section.items.map((item) => (
                  <HubFeatureButton
                    key={item.id}
                    item={item}
                    icon={getHubIcon(item.id)}
                    onOpen={() => onNavigateToFeature(item.route)}
                  />
                ))}
              </div>
            </SurfacePanel>
          ))}
        </div>
      </main>
    </AppScreen>
  );
}

function HubFeatureButton({
  item,
  icon,
  onOpen,
}: {
  item: FeatureFlowItem;
  icon: ReactNode;
  onOpen: () => void;
}) {
  const tone = hubToneClasses[item.tone];
  return (
    <button
      type="button"
      aria-label={`Open ${item.title}`}
      onClick={onOpen}
      className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.subtlePress} flex min-h-24 w-full items-start gap-3 border p-4 text-left hover:shadow-md ${tone.surface}`}
    >
      <span className={`${UI_RADIUS.touchIcon} flex h-11 w-11 shrink-0 items-center justify-center ${tone.icon}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold text-slate-950 dark:text-white">{item.title}</span>
        <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">{item.description}</span>
        <span className={`mt-3 inline-flex ${UI_RADIUS.pill} px-3 py-1.5 text-xs font-extrabold ${tone.badge}`}>
          Open
        </span>
      </span>
    </button>
  );
}

const hubToneClasses: Record<FeatureFlowTone, {
  surface: string;
  icon: string;
  badge: string;
}> = {
  indigo: {
    surface: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40',
    icon: 'bg-indigo-600 text-white',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100',
  },
  teal: {
    surface: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/40',
    icon: 'bg-teal-600 text-white',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-100',
  },
  purple: {
    surface: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/40',
    icon: 'bg-purple-600 text-white',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100',
  },
  amber: {
    surface: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
    icon: 'bg-amber-500 text-slate-950',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  },
  blue: {
    surface: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40',
    icon: 'bg-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100',
  },
  emerald: {
    surface: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
    icon: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100',
  },
  slate: {
    surface: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70',
    icon: 'bg-slate-700 text-white',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  },
};

function getHubIcon(itemId: string) {
  if (itemId === 'sentence-placement') return <Puzzle size={18} />;
  if (itemId === 'grammar-lab') return <FlaskConical size={18} />;
  if (itemId === 'topic-deck') return <Layers3 size={18} />;
  if (itemId === 'your-vocabulary') return <BookOpenCheck size={18} />;
  if (itemId === 'word-library') return <BookOpen size={18} />;
  if (itemId === 'learning-system') return <ShieldCheck size={18} />;
  if (itemId === 'build-sentence' || itemId === 'compose-sentence') return <Route size={18} />;
  if (itemId === 'word-cloud' || itemId === 'clusters') return <Sparkles size={18} />;
  return <Compass size={18} />;
}
