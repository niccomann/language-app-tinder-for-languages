export const featureGuideIds = [
  'vocabularyScan',
  'wordMatch',
  'listenSentences',
  'learningPath',
  'learningFilters',
  'learningSystem',
  'sentencePlacement',
  'library',
  'grammarGraph',
  'wordCloud',
  'sentenceGraphBuilder',
  'sentenceComposer',
  'clusters',
  'dialects',
  'hierarchy',
] as const;

export type FeatureGuideId = typeof featureGuideIds[number];
