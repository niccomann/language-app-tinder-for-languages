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
    title: 'First we learn what you know',
    body: 'Swipe through words: the ones you recognize and the ones to review become your initial profile.',
    actionLabel: 'Show me the scan',
    tone: 'practice',
    frames: [
      { key: 'guide_vocabulary_scan_a', src: guideVocabularyScanA },
      { key: 'guide_vocabulary_scan_b', src: guideVocabularyScanB },
    ],
  },
  learningPath: {
    id: 'learningPath',
    title: 'The path adapts',
    body: 'Every step comes from what you just showed: strong vocabulary, weak vocabulary, and the next challenge.',
    actionLabel: 'Show me the path',
    tone: 'map',
    frames: [
      { key: 'guide_learning_path_a', src: guideLearningPathA },
      { key: 'guide_learning_path_b', src: guideLearningPathB },
    ],
  },
  learningFilters: {
    id: 'learningFilters',
    title: 'Choose the training ground',
    body: 'Filters help you train one precise area: nouns, verbs, concepts, or categories you want to reinforce.',
    actionLabel: 'Show me the filters',
    tone: 'practice',
    frames: [
      { key: 'guide_learning_filters_a', src: guideLearningFiltersA },
      { key: 'guide_learning_filters_b', src: guideLearningFiltersB },
    ],
  },
  learningSystem: {
    id: 'learningSystem',
    title: 'The science keeps score',
    body: 'You answer naturally. The system updates how well you know each word and when it is worth reviewing.',
    actionLabel: 'Show me the method',
    tone: 'science',
    frames: [
      { key: 'guide_learning_system_a', src: guideLearningSystemA },
      { key: 'guide_learning_system_b', src: guideLearningSystemB },
    ],
  },
  sentencePlacement: {
    id: 'sentencePlacement',
    title: 'Now we build sentences',
    body: 'Knowing isolated words is not enough: here you choose the right order and train grammar, logic, and memory.',
    actionLabel: 'Show me the sentence',
    tone: 'grammar',
    frames: [
      { key: 'guide_sentence_placement_a', src: guideSentencePlacementA },
      { key: 'guide_sentence_placement_b', src: guideSentencePlacementB },
    ],
  },
  library: {
    id: 'library',
    title: 'The library is your memory',
    body: 'Here you can find every word with translations, examples, links, and useful details for better study.',
    actionLabel: 'Show me the library',
    tone: 'library',
    frames: [
      { key: 'guide_library_a', src: guideLibraryA },
      { key: 'guide_library_b', src: guideLibraryB },
    ],
  },
  grammarGraph: {
    id: 'grammarGraph',
    title: 'Look at the connections',
    body: 'The graph shows how words, roles, and relationships fit together instead of staying as separate lists.',
    actionLabel: 'Show me the graph',
    tone: 'grammar',
    frames: [
      { key: 'guide_grammar_graph_a', src: guideGrammarGraphA },
      { key: 'guide_grammar_graph_b', src: guideGrammarGraphB },
    ],
  },
  wordCloud: {
    id: 'wordCloud',
    title: 'See what carries more weight',
    body: 'The cloud highlights the most present or relevant words, so you know where to look first.',
    actionLabel: 'Show me the cloud',
    tone: 'grammar',
    frames: [
      { key: 'guide_word_cloud_a', src: guideWordCloudA },
      { key: 'guide_word_cloud_b', src: guideWordCloudB },
    ],
  },
  sentenceGraphBuilder: {
    id: 'sentenceGraphBuilder',
    title: 'Compose with nodes',
    body: 'This view lets you build sentences while also seeing the structure: who does what, and with which links.',
    actionLabel: 'Show me the nodes',
    tone: 'grammar',
    frames: [
      { key: 'guide_sentence_graph_builder_a', src: guideSentenceGraphBuilderA },
      { key: 'guide_sentence_graph_builder_b', src: guideSentenceGraphBuilderB },
    ],
  },
  sentenceComposer: {
    id: 'sentenceComposer',
    title: 'Compose the simple way',
    body: 'Here you put words in order and immediately test whether the sentence sounds correct and understandable.',
    actionLabel: 'Show me the composer',
    tone: 'grammar',
    frames: [
      { key: 'guide_sentence_composer_a', src: guideSentenceComposerA },
      { key: 'guide_sentence_composer_b', src: guideSentenceComposerB },
    ],
  },
  clusters: {
    id: 'clusters',
    title: 'Group the concepts',
    body: 'Clusters reveal word families: they help you study by blocks, not word by word.',
    actionLabel: 'Show me the groups',
    tone: 'grammar',
    frames: [
      { key: 'guide_clusters_a', src: guideClustersA },
      { key: 'guide_clusters_b', src: guideClustersB },
    ],
  },
  dialects: {
    id: 'dialects',
    title: 'Discover variants',
    body: 'Language changes by area and context. This view shows where a word can take on different nuances.',
    actionLabel: 'Show me the variants',
    tone: 'grammar',
    frames: [
      { key: 'guide_dialects_a', src: guideDialectsA },
      { key: 'guide_dialects_b', src: guideDialectsB },
    ],
  },
  hierarchy: {
    id: 'hierarchy',
    title: 'Give the system structure',
    body: 'The hierarchy shows levels and families: from the large concept down to more specific words.',
    actionLabel: 'Show me the hierarchy',
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
