export type FeatureFlowPhase = 'primary' | 'upcoming' | 'collection' | 'advanced';

export type FeatureFlowTone =
  | 'indigo'
  | 'teal'
  | 'purple'
  | 'amber'
  | 'blue'
  | 'emerald'
  | 'slate';

export interface FeatureFlowItem {
  id: string;
  title: string;
  missionLabel: string;
  description: string;
  route: string;
  phase: FeatureFlowPhase;
  tone: FeatureFlowTone;
  order: number;
  ctaLabel: string;
}

export const featureFlowItems: FeatureFlowItem[] = [
  {
    id: 'vocabulary-review',
    title: 'Vocabulary Review',
    missionLabel: 'Mission 1',
    description: 'Swipe words you know or miss so the system can keep tuning your German level.',
    route: '/learn',
    phase: 'primary',
    tone: 'indigo',
    order: 10,
    ctaLabel: 'Continue path',
  },
  {
    id: 'sentence-placement',
    title: 'Sentence Placement',
    missionLabel: 'Mission 2',
    description: 'Build short sentences from a controlled word bank to test grammar beyond single words.',
    route: '/placement/sentence',
    phase: 'upcoming',
    tone: 'teal',
    order: 20,
    ctaLabel: 'Open Sentence Placement mission',
  },
  {
    id: 'grammar-lab',
    title: 'Grammar Lab',
    missionLabel: 'Mission 3',
    description: 'Inspect sentence logic, grammar relationships, and builder tools when you are ready.',
    route: '/grammar/graph',
    phase: 'upcoming',
    tone: 'blue',
    order: 30,
    ctaLabel: 'Open Grammar Lab mission',
  },
  {
    id: 'topic-deck',
    title: 'Topic Deck',
    missionLabel: 'Setup',
    description: 'Tune the packs used in the swipe deck without turning the app into a settings screen.',
    route: '/learn/filters',
    phase: 'collection',
    tone: 'amber',
    order: 40,
    ctaLabel: 'Open Topics mission',
  },
  {
    id: 'word-library',
    title: 'Word Library',
    missionLabel: 'Collection',
    description: 'Review every saved word, image, translation, example, etymology, and database row.',
    route: '/library',
    phase: 'collection',
    tone: 'purple',
    order: 50,
    ctaLabel: 'Open Word Library mission',
  },
  {
    id: 'learning-system',
    title: 'Learning System',
    missionLabel: 'Science',
    description: 'See how every swipe updates mastery, level, and the next recommended contexts.',
    route: '/learn/system',
    phase: 'collection',
    tone: 'emerald',
    order: 60,
    ctaLabel: 'Open Learning System mission',
  },
  {
    id: 'word-cloud',
    title: 'Word Cloud',
    missionLabel: 'Explore',
    description: 'Explore the vocabulary space visually after the core practice loop.',
    route: '/grammar/word-cloud',
    phase: 'advanced',
    tone: 'blue',
    order: 70,
    ctaLabel: 'Open Word Cloud mission',
  },
  {
    id: 'build-sentence',
    title: 'Build Sentence',
    missionLabel: 'Explore',
    description: 'Compose sentence structures with the full grammar word bank.',
    route: '/grammar/build-sentence',
    phase: 'advanced',
    tone: 'teal',
    order: 80,
    ctaLabel: 'Open Build Sentence mission',
  },
  {
    id: 'compose-sentence',
    title: 'Compose Sentence',
    missionLabel: 'Explore',
    description: 'Use the alternate composer view while keeping the same sentence-building language.',
    route: '/grammar/compose-sentence',
    phase: 'advanced',
    tone: 'indigo',
    order: 90,
    ctaLabel: 'Open Compose Sentence mission',
  },
  {
    id: 'clusters',
    title: 'Clusters',
    missionLabel: 'Explore',
    description: 'Inspect semantic groups and word-image neighborhoods.',
    route: '/grammar/clusters',
    phase: 'advanced',
    tone: 'purple',
    order: 100,
    ctaLabel: 'Open Clusters mission',
  },
  {
    id: 'dialects',
    title: 'Dialects',
    missionLabel: 'Explore',
    description: 'Browse regional language variation once the core path is familiar.',
    route: '/grammar/dialects',
    phase: 'advanced',
    tone: 'amber',
    order: 110,
    ctaLabel: 'Open Dialects mission',
  },
  {
    id: 'hierarchy',
    title: 'Hierarchy',
    missionLabel: 'Explore',
    description: 'See the vocabulary hierarchy and concept structure.',
    route: '/grammar/hierarchy',
    phase: 'advanced',
    tone: 'slate',
    order: 120,
    ctaLabel: 'Open Hierarchy mission',
  },
];

export function getPrimaryFeatureFlowItem(): FeatureFlowItem {
  const primaryFeature = getFeatureFlowItemsByPhase('primary')[0];
  if (!primaryFeature) {
    throw new Error('Feature flow registry requires one primary feature.');
  }
  return primaryFeature;
}

export function getFeatureFlowItemsByPhase(phase: FeatureFlowPhase) {
  return featureFlowItems
    .filter((item) => item.phase === phase)
    .sort((left, right) => left.order - right.order);
}
