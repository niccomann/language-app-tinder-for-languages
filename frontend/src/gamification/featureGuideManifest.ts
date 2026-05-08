import guideClustersA from '../assets/gamification/guide_clusters_a.png';
import guideClustersB from '../assets/gamification/guide_clusters_b.png';
import guideDialectsA from '../assets/gamification/guide_dialects_a.png';
import guideDialectsB from '../assets/gamification/guide_dialects_b.png';
import guideGrammarGraphA from '../assets/gamification/guide_grammar_graph_a.png';
import guideGrammarGraphB from '../assets/gamification/guide_grammar_graph_b.png';
import guideHierarchyA from '../assets/gamification/guide_hierarchy_a.png';
import guideHierarchyB from '../assets/gamification/guide_hierarchy_b.png';
import guideLearningFiltersA from '../assets/gamification/guide_learning_filters_a.png';
import guideLearningFiltersB from '../assets/gamification/guide_learning_filters_b.png';
import guideLearningPathA from '../assets/gamification/guide_learning_path_a.png';
import guideLearningPathB from '../assets/gamification/guide_learning_path_b.png';
import guideLearningSystemA from '../assets/gamification/guide_learning_system_a.png';
import guideLearningSystemB from '../assets/gamification/guide_learning_system_b.png';
import guideLibraryA from '../assets/gamification/guide_library_a.png';
import guideLibraryB from '../assets/gamification/guide_library_b.png';
import guideSentenceComposerA from '../assets/gamification/guide_sentence_composer_a.png';
import guideSentenceComposerB from '../assets/gamification/guide_sentence_composer_b.png';
import guideSentenceGraphBuilderA from '../assets/gamification/guide_sentence_graph_builder_a.png';
import guideSentenceGraphBuilderB from '../assets/gamification/guide_sentence_graph_builder_b.png';
import guideSentencePlacementA from '../assets/gamification/guide_sentence_placement_a.png';
import guideSentencePlacementB from '../assets/gamification/guide_sentence_placement_b.png';
import guideVocabularyScanA from '../assets/gamification/guide_vocabulary_scan_a.png';
import guideVocabularyScanB from '../assets/gamification/guide_vocabulary_scan_b.png';
import guideWordCloudA from '../assets/gamification/guide_word_cloud_a.png';
import guideWordCloudB from '../assets/gamification/guide_word_cloud_b.png';
import { copy } from '../i18n/staticCopy';
import type { RouteState } from '../routes/appRoutes';
import type { FeatureGuideId } from './featureGuideIds';

export type { FeatureGuideId } from './featureGuideIds';

export type FeatureGuideTone = 'practice' | 'science' | 'map' | 'library' | 'grammar';

export interface FeatureGuideFrame {
  key: string;
  src: string;
}

export interface FeatureGuide {
  id: FeatureGuideId;
  title: string;
  body: string;
  actionLabel: string;
  tone: FeatureGuideTone;
  frames: FeatureGuideFrame[];
}

export const featureGuides = {
  vocabularyScan: {
    id: 'vocabularyScan',
    title: copy.featureGuides.vocabularyScan.title,
    body: copy.featureGuides.vocabularyScan.body,
    actionLabel: copy.featureGuides.vocabularyScan.actionLabel,
    tone: 'practice',
    frames: [
      { key: 'guide_vocabulary_scan_a', src: guideVocabularyScanA },
      { key: 'guide_vocabulary_scan_b', src: guideVocabularyScanB },
    ],
  },
  learningPath: {
    id: 'learningPath',
    title: copy.featureGuides.learningPath.title,
    body: copy.featureGuides.learningPath.body,
    actionLabel: copy.featureGuides.learningPath.actionLabel,
    tone: 'map',
    frames: [
      { key: 'guide_learning_path_a', src: guideLearningPathA },
      { key: 'guide_learning_path_b', src: guideLearningPathB },
    ],
  },
  learningFilters: {
    id: 'learningFilters',
    title: copy.featureGuides.learningFilters.title,
    body: copy.featureGuides.learningFilters.body,
    actionLabel: copy.featureGuides.learningFilters.actionLabel,
    tone: 'practice',
    frames: [
      { key: 'guide_learning_filters_a', src: guideLearningFiltersA },
      { key: 'guide_learning_filters_b', src: guideLearningFiltersB },
    ],
  },
  learningSystem: {
    id: 'learningSystem',
    title: copy.featureGuides.learningSystem.title,
    body: copy.featureGuides.learningSystem.body,
    actionLabel: copy.featureGuides.learningSystem.actionLabel,
    tone: 'science',
    frames: [
      { key: 'guide_learning_system_a', src: guideLearningSystemA },
      { key: 'guide_learning_system_b', src: guideLearningSystemB },
    ],
  },
  sentencePlacement: {
    id: 'sentencePlacement',
    title: copy.featureGuides.sentencePlacement.title,
    body: copy.featureGuides.sentencePlacement.body,
    actionLabel: copy.featureGuides.sentencePlacement.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_sentence_placement_a', src: guideSentencePlacementA },
      { key: 'guide_sentence_placement_b', src: guideSentencePlacementB },
    ],
  },
  library: {
    id: 'library',
    title: copy.featureGuides.library.title,
    body: copy.featureGuides.library.body,
    actionLabel: copy.featureGuides.library.actionLabel,
    tone: 'library',
    frames: [
      { key: 'guide_library_a', src: guideLibraryA },
      { key: 'guide_library_b', src: guideLibraryB },
    ],
  },
  grammarGraph: {
    id: 'grammarGraph',
    title: copy.featureGuides.grammarGraph.title,
    body: copy.featureGuides.grammarGraph.body,
    actionLabel: copy.featureGuides.grammarGraph.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_grammar_graph_a', src: guideGrammarGraphA },
      { key: 'guide_grammar_graph_b', src: guideGrammarGraphB },
    ],
  },
  wordCloud: {
    id: 'wordCloud',
    title: copy.featureGuides.wordCloud.title,
    body: copy.featureGuides.wordCloud.body,
    actionLabel: copy.featureGuides.wordCloud.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_word_cloud_a', src: guideWordCloudA },
      { key: 'guide_word_cloud_b', src: guideWordCloudB },
    ],
  },
  sentenceGraphBuilder: {
    id: 'sentenceGraphBuilder',
    title: copy.featureGuides.sentenceGraphBuilder.title,
    body: copy.featureGuides.sentenceGraphBuilder.body,
    actionLabel: copy.featureGuides.sentenceGraphBuilder.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_sentence_graph_builder_a', src: guideSentenceGraphBuilderA },
      { key: 'guide_sentence_graph_builder_b', src: guideSentenceGraphBuilderB },
    ],
  },
  sentenceComposer: {
    id: 'sentenceComposer',
    title: copy.featureGuides.sentenceComposer.title,
    body: copy.featureGuides.sentenceComposer.body,
    actionLabel: copy.featureGuides.sentenceComposer.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_sentence_composer_a', src: guideSentenceComposerA },
      { key: 'guide_sentence_composer_b', src: guideSentenceComposerB },
    ],
  },
  clusters: {
    id: 'clusters',
    title: copy.featureGuides.clusters.title,
    body: copy.featureGuides.clusters.body,
    actionLabel: copy.featureGuides.clusters.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_clusters_a', src: guideClustersA },
      { key: 'guide_clusters_b', src: guideClustersB },
    ],
  },
  dialects: {
    id: 'dialects',
    title: copy.featureGuides.dialects.title,
    body: copy.featureGuides.dialects.body,
    actionLabel: copy.featureGuides.dialects.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_dialects_a', src: guideDialectsA },
      { key: 'guide_dialects_b', src: guideDialectsB },
    ],
  },
  hierarchy: {
    id: 'hierarchy',
    title: copy.featureGuides.hierarchy.title,
    body: copy.featureGuides.hierarchy.body,
    actionLabel: copy.featureGuides.hierarchy.actionLabel,
    tone: 'grammar',
    frames: [
      { key: 'guide_hierarchy_a', src: guideHierarchyA },
      { key: 'guide_hierarchy_b', src: guideHierarchyB },
    ],
  },
} satisfies Record<FeatureGuideId, FeatureGuide>;

export function resolveFeatureGuideForRoute(route: RouteState): FeatureGuideId {
  if (route.screen === 'learning') {
    if (route.mode === 'grammar_placement') return 'sentencePlacement';
    if (route.mode === 'filters') return 'learningFilters';
    if (route.mode === 'system') return 'learningSystem';
    if (route.mode === 'path') return 'learningPath';
    return 'vocabularyScan';
  }

  if (route.screen === 'library') return 'library';

  if (route.screen === 'grammar') {
    switch (route.view) {
      case 'graph':
        return 'grammarGraph';
      case 'wordcloud':
        return 'wordCloud';
      case 'builder':
        return 'sentenceGraphBuilder';
      case 'funbuilder':
        return 'sentenceComposer';
      case 'clusters':
        return 'clusters';
      case 'dialects':
        return 'dialects';
      case 'sunburst':
        return 'hierarchy';
      default:
        return 'grammarGraph';
    }
  }

  return 'learningPath';
}

export function featureGuideRouteKey(route: RouteState) {
  if (route.screen === 'learning') return `learning:${route.mode}`;
  if (route.screen === 'library') {
    return `library:${route.wordId ?? 'all'}:${route.detailTab ?? 'list'}:${route.filtersOpen ? 'filters' : 'browse'}`;
  }
  return `grammar:${route.view}`;
}
