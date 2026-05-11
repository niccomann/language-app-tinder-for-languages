import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, BookOpenCheck, Compass, FlaskConical, Layers3, Puzzle, Route, ShieldCheck, Sparkles } from 'lucide-react';
import { AppScreen, ScreenHeader, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import {
  getFeatureFlowItemsByPhase,
  type FeatureFlowItem,
  type FeatureFlowTone,
} from '../gamification/featureFlowRegistry';

type FeatureHubKind = 'review' | 'explore' | 'explore_grammar' | 'explore_map';

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
  const grammarSection: HubSection = {
    title: 'Grammar training',
    body: 'Use these when the path needs sentence logic, grammar practice, or builder tools.',
    items: grammarTrainingItems,
  };
  const mapSection: HubSection = {
    title: 'Language map',
    body: 'Explore relationships, clusters, dialects, and hierarchy when you want to inspect the system.',
    items: languageMapItems,
  };
  const sections: HubSection[] =
    kind === 'review'
      ? [{
          title: 'Review & setup',
          body: 'Adjust the deck, inspect known words, open the library, or review how the learning system scores memory.',
          items: collectionItems,
        }]
      : kind === 'explore_grammar'
        ? [grammarSection]
        : kind === 'explore_map'
          ? [mapSection]
          : [grammarSection, mapSection];

  const title =
    kind === 'review' ? 'Review & Setup'
    : kind === 'explore_grammar' ? 'Grammar Training'
    : kind === 'explore_map' ? 'Language Map'
    : 'Explore German';

  const subtitle =
    kind === 'review'
      ? `Tools are grouped here so the path can stay focused. Topics ${selectedCategoriesCount}/${categoriesCount || 0} are active.`
      : kind === 'explore_grammar'
        ? 'Sentence-level checks, builder, lab grammaticale.'
        : kind === 'explore_map'
          ? 'Cluster, dialetti, gerarchia e nuvole di parole.'
          : 'Strumenti avanzati: pratica grammaticale o mappa della lingua.';

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
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-10 items-center gap-2 border border-hairline bg-canvas px-3 py-2 text-body-sm font-medium text-ink hover:bg-surface-card`}
            >
              <ArrowLeft size={17} />
              Path
            </button>
          )}
        />

        {kind === 'explore' && (
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => onNavigateToFeature('/explore/grammar')}
              className={`${UI_RADIUS.surface} ${UI_INTERACTION.transition} flex min-h-[120px] flex-col items-start gap-2 border border-hairline bg-canvas p-5 text-left hover:bg-surface-card`}
            >
              <span className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
                Grammar training
              </span>
              <span className="block font-display text-display-sm font-normal text-ink">Grammar</span>
              <span className="text-body-sm text-muted">
                Sentence Placement, Grammar Lab, Build / Compose Sentence.
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToFeature('/explore/map')}
              className={`${UI_RADIUS.surface} ${UI_INTERACTION.transition} flex min-h-[120px] flex-col items-start gap-2 border border-hairline bg-canvas p-5 text-left hover:bg-surface-card`}
            >
              <span className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-primary">
                Language map
              </span>
              <span className="block font-display text-display-sm font-normal text-ink">Map</span>
              <span className="text-body-sm text-muted">
                Word Cloud, Clusters, Dialects, Hierarchy.
              </span>
            </button>
          </div>
        )}
        {kind !== 'explore' && (
          <div className="grid gap-4">
            {sections.map((section) => (
              <SurfacePanel key={section.title} padding="lg" className="space-y-4">
                <div>
                  <p className="text-caption-uppercase tracking-[1.5px] text-primary uppercase">
                    {section.title}
                  </p>
                  <p className="mt-2 max-w-3xl text-body-sm font-medium leading-6 text-muted">
                    {section.body}
                  </p>
                </div>

                <div className="grid auto-rows-fr gap-3 md:grid-cols-2">
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
        )}
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
      className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex h-full min-h-24 w-full items-start gap-3 border p-4 text-left hover:bg-surface-cream-strong ${tone.surface}`}
    >
      <span className={`${UI_RADIUS.touchIcon} flex h-11 w-11 shrink-0 items-center justify-center ${tone.icon}`}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col self-stretch">
        <span className="block font-sans font-semibold text-body-md text-ink">{item.title}</span>
        <span className="mt-1 block text-body-sm font-medium leading-5 text-muted">{item.description}</span>
        <span className={`mt-auto inline-flex w-fit ${UI_RADIUS.pill} px-3 py-1.5 text-caption font-medium ${tone.badge}`}>
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
  coral: {
    surface: 'border-hairline bg-surface-card',
    icon: 'bg-primary text-on-primary',
    badge: 'bg-surface-card text-primary border border-hairline',
  },
  teal: {
    surface: 'border-hairline bg-surface-card',
    icon: 'bg-accent-teal text-ink',
    badge: 'bg-surface-card text-accent-teal border border-hairline',
  },
  amber: {
    surface: 'border-hairline bg-surface-card',
    icon: 'bg-accent-amber text-ink',
    badge: 'bg-surface-card text-accent-amber border border-hairline',
  },
  success: {
    surface: 'border-hairline bg-surface-card',
    icon: 'bg-success text-ink',
    badge: 'bg-surface-card text-success border border-hairline',
  },
  muted: {
    surface: 'border-hairline bg-surface-card',
    icon: 'bg-ink text-canvas',
    badge: 'bg-surface-card text-muted border border-hairline',
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
