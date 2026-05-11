import type { ReactNode } from 'react';
import { BookOpen, BookOpenCheck, Compass, FlaskConical, Layers3, Puzzle, Route, ShieldCheck, Sparkles } from 'lucide-react';
import { SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { SceneShell, EYEBROW_CLASS } from './scene';
import {
  getFeatureFlowItemsByPhase,
  type FeatureFlowItem,
  type FeatureFlowTone,
} from '../gamification/featureFlowRegistry';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';

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
  const copy = useCopy();
  const target = useTargetLanguage();
  const fhs = copy.featureHubScreen;
  const collectionItems = getFeatureFlowItemsByPhase('collection');
  const upcomingItems = getFeatureFlowItemsByPhase('upcoming');
  const advancedItems = getFeatureFlowItemsByPhase('advanced');
  const grammarTrainingItems = [
    ...upcomingItems,
    ...advancedItems.filter((item) => grammarTrainingIds.has(item.id)),
  ];
  const languageMapItems = advancedItems.filter((item) => !grammarTrainingIds.has(item.id));
  const grammarSection: HubSection = {
    title: fhs.grammarTraining.title,
    body: fhs.grammarTraining.body,
    items: grammarTrainingItems,
  };
  const mapSection: HubSection = {
    title: fhs.languageMap.title,
    body: fhs.languageMap.body,
    items: languageMapItems,
  };
  const sections: HubSection[] =
    kind === 'review'
      ? [{
          title: fhs.review.sectionTitle,
          body: fhs.review.sectionBody,
          items: collectionItems,
        }]
      : kind === 'explore_grammar'
        ? [grammarSection]
        : kind === 'explore_map'
          ? [mapSection]
          : [grammarSection, mapSection];

  const title =
    kind === 'review' ? fhs.review.title
    : kind === 'explore_grammar' ? fhs.exploreGrammar.title
    : kind === 'explore_map' ? fhs.exploreMap.title
    : formatCopy(fhs.exploreHub.title, { language: copy.targetLanguageNames[target] });

  const subtitle =
    kind === 'review'
      ? formatCopy(fhs.review.subtitle, { selected: selectedCategoriesCount, total: categoriesCount || 0 })
      : kind === 'explore_grammar'
        ? fhs.exploreGrammar.subtitle
        : kind === 'explore_map'
          ? fhs.exploreMap.subtitle
          : fhs.exploreHub.subtitle;

  const eyebrow =
    kind === 'review' ? fhs.review.eyebrow
    : kind === 'explore_grammar' ? fhs.exploreGrammar.eyebrow
    : kind === 'explore_map' ? fhs.exploreMap.eyebrow
    : fhs.exploreHub.eyebrow;

  return (
    <SceneShell
      eyebrow={eyebrow}
      title={title}
      subline={subtitle}
      back={{ onClick: onBack }}
      onNavigate={onNavigateToFeature}
    >
      {kind === 'explore' && (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onNavigateToFeature('/explore/grammar')}
            className={`${UI_RADIUS.surface} ${UI_INTERACTION.transition} flex min-h-[120px] flex-col items-start gap-2 border border-hairline bg-canvas p-5 text-left hover:bg-surface-card`}
          >
            <span className={`${EYEBROW_CLASS} text-primary`}>{fhs.grammarTraining.title}</span>
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
            <span className={`${EYEBROW_CLASS} text-primary`}>{fhs.languageMap.title}</span>
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
                <p className={`${EYEBROW_CLASS} text-primary`}>{section.title}</p>
                <p className="mt-2 text-body-sm font-medium leading-6 text-muted">{section.body}</p>
              </div>

              <div className="grid auto-rows-fr gap-3">
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
    </SceneShell>
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
