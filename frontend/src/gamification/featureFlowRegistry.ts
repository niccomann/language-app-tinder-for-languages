import { copy } from '../i18n/staticCopy';
import type { FeatureGuideId } from './featureGuideIds';

export type FeatureFlowPhase = 'primary' | 'upcoming' | 'collection' | 'advanced';

export type FeatureFlowTone =
  | 'coral'
  | 'teal'
  | 'amber'
  | 'success'
  | 'muted';

export interface FeatureFlowItem {
  id: string;
  title: string;
  missionLabel: string;
  description: string;
  route: string;
  guideId: FeatureGuideId;
  phase: FeatureFlowPhase;
  tone: FeatureFlowTone;
  order: number;
  ctaLabel: string;
}

export const featureFlowItems: FeatureFlowItem[] = [
  {
    id: 'vocabulary-review',
    title: copy.featureFlow.vocabularyReview.title,
    missionLabel: copy.featureFlow.vocabularyReview.missionLabel,
    description: copy.featureFlow.vocabularyReview.description,
    route: '/learn',
    guideId: 'vocabularyScan',
    phase: 'primary',
    tone: 'coral',
    order: 10,
    ctaLabel: copy.featureFlow.vocabularyReview.ctaLabel,
  },
  {
    id: 'sentence-placement',
    title: copy.featureFlow.sentencePlacement.title,
    missionLabel: copy.featureFlow.sentencePlacement.missionLabel,
    description: copy.featureFlow.sentencePlacement.description,
    route: '/placement/sentence',
    guideId: 'sentencePlacement',
    phase: 'upcoming',
    tone: 'teal',
    order: 20,
    ctaLabel: copy.featureFlow.sentencePlacement.ctaLabel,
  },
  {
    id: 'grammar-lab',
    title: copy.featureFlow.grammarLab.title,
    missionLabel: copy.featureFlow.grammarLab.missionLabel,
    description: copy.featureFlow.grammarLab.description,
    route: '/grammar/graph',
    guideId: 'grammarGraph',
    phase: 'upcoming',
    tone: 'coral',
    order: 30,
    ctaLabel: copy.featureFlow.grammarLab.ctaLabel,
  },
  {
    id: 'topic-deck',
    title: copy.featureFlow.topicDeck.title,
    missionLabel: copy.featureFlow.topicDeck.missionLabel,
    description: copy.featureFlow.topicDeck.description,
    route: '/learn/filters',
    guideId: 'learningFilters',
    phase: 'collection',
    tone: 'amber',
    order: 40,
    ctaLabel: copy.featureFlow.topicDeck.ctaLabel,
  },
  {
    id: 'your-vocabulary',
    title: copy.featureFlow.yourVocabulary.title,
    missionLabel: copy.featureFlow.yourVocabulary.missionLabel,
    description: copy.featureFlow.yourVocabulary.description,
    route: '/vocabulary',
    guideId: 'vocabularyScan',
    phase: 'collection',
    tone: 'success',
    order: 45,
    ctaLabel: copy.featureFlow.yourVocabulary.ctaLabel,
  },
  {
    id: 'word-library',
    title: copy.featureFlow.wordLibrary.title,
    missionLabel: copy.featureFlow.wordLibrary.missionLabel,
    description: copy.featureFlow.wordLibrary.description,
    route: '/library',
    guideId: 'library',
    phase: 'collection',
    tone: 'coral',
    order: 50,
    ctaLabel: copy.featureFlow.wordLibrary.ctaLabel,
  },
  {
    id: 'learning-system',
    title: copy.featureFlow.learningSystem.title,
    missionLabel: copy.featureFlow.learningSystem.missionLabel,
    description: copy.featureFlow.learningSystem.description,
    route: '/learn/system',
    guideId: 'learningSystem',
    phase: 'collection',
    tone: 'success',
    order: 60,
    ctaLabel: copy.featureFlow.learningSystem.ctaLabel,
  },
  {
    id: 'word-cloud',
    title: copy.featureFlow.wordCloud.title,
    missionLabel: copy.featureFlow.wordCloud.missionLabel,
    description: copy.featureFlow.wordCloud.description,
    route: '/grammar/word-cloud',
    guideId: 'wordCloud',
    phase: 'advanced',
    tone: 'coral',
    order: 70,
    ctaLabel: copy.featureFlow.wordCloud.ctaLabel,
  },
  {
    id: 'build-sentence',
    title: copy.featureFlow.buildSentence.title,
    missionLabel: copy.featureFlow.buildSentence.missionLabel,
    description: copy.featureFlow.buildSentence.description,
    route: '/grammar/build-sentence',
    guideId: 'sentenceGraphBuilder',
    phase: 'advanced',
    tone: 'teal',
    order: 80,
    ctaLabel: copy.featureFlow.buildSentence.ctaLabel,
  },
  {
    id: 'compose-sentence',
    title: copy.featureFlow.composeSentence.title,
    missionLabel: copy.featureFlow.composeSentence.missionLabel,
    description: copy.featureFlow.composeSentence.description,
    route: '/grammar/compose-sentence',
    guideId: 'sentenceComposer',
    phase: 'advanced',
    tone: 'coral',
    order: 90,
    ctaLabel: copy.featureFlow.composeSentence.ctaLabel,
  },
  {
    id: 'clusters',
    title: copy.featureFlow.clusters.title,
    missionLabel: copy.featureFlow.clusters.missionLabel,
    description: copy.featureFlow.clusters.description,
    route: '/grammar/clusters',
    guideId: 'clusters',
    phase: 'advanced',
    tone: 'coral',
    order: 100,
    ctaLabel: copy.featureFlow.clusters.ctaLabel,
  },
  {
    id: 'dialects',
    title: copy.featureFlow.dialects.title,
    missionLabel: copy.featureFlow.dialects.missionLabel,
    description: copy.featureFlow.dialects.description,
    route: '/grammar/dialects',
    guideId: 'dialects',
    phase: 'advanced',
    tone: 'amber',
    order: 110,
    ctaLabel: copy.featureFlow.dialects.ctaLabel,
  },
  {
    id: 'hierarchy',
    title: copy.featureFlow.hierarchy.title,
    missionLabel: copy.featureFlow.hierarchy.missionLabel,
    description: copy.featureFlow.hierarchy.description,
    route: '/grammar/hierarchy',
    guideId: 'hierarchy',
    phase: 'advanced',
    tone: 'muted',
    order: 120,
    ctaLabel: copy.featureFlow.hierarchy.ctaLabel,
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
