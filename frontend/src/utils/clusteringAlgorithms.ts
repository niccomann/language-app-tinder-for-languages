import type { WordCloudItem } from '../types';

export function levenshteinDistance(stringA: string, stringB: string): number {
  const lowerA = stringA.toLowerCase();
  const lowerB = stringB.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= lowerB.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lowerA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= lowerB.length; i++) {
    for (let j = 1; j <= lowerA.length; j++) {
      if (lowerB.charAt(i - 1) === lowerA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[lowerB.length][lowerA.length];
}

export function humanSimilarityScore(wordA: string, wordB: string): number {
  const lowerA = wordA.toLowerCase();
  const lowerB = wordB.toLowerCase();
  
  if (lowerA.charAt(0) !== lowerB.charAt(0)) {
    return 1000;
  }
  
  let score = 0;
  const prefixLength = Math.min(lowerA.length, lowerB.length, 3);
  for (let i = 0; i < prefixLength; i++) {
    if (lowerA.charAt(i) === lowerB.charAt(i)) {
      score -= (3 - i) * 2;
    } else {
      score += (3 - i) * 3;
    }
  }
  
  const levenshtein = levenshteinDistance(wordA, wordB);
  score += levenshtein * 2;
  
  return score;
}

export function computeSimilarityClusters(words: WordCloudItem[], maxClusters: number = 10): Map<string, string> {
  const clusterMap = new Map<string, string>();
  if (words.length === 0) return clusterMap;

  const wordTexts = words.map(word => word.text);
  const clusters: string[][] = [];
  const assigned = new Set<string>();

  const sortedWords = [...wordTexts].sort((a, b) => 
    a.charAt(0).localeCompare(b.charAt(0)) || a.length - b.length
  );

  for (const word of sortedWords) {
    if (assigned.has(word)) continue;

    let bestClusterIndex = -1;
    let bestScore = Infinity;

    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
      const clusterRepresentative = clusters[clusterIndex][0];
      const score = humanSimilarityScore(word, clusterRepresentative);

      if (score < bestScore && score < 10) {
        bestScore = score;
        bestClusterIndex = clusterIndex;
      }
    }

    if (bestClusterIndex >= 0) {
      clusters[bestClusterIndex].push(word);
      assigned.add(word);
    } else if (clusters.length < maxClusters) {
      clusters.push([word]);
      assigned.add(word);
    } else {
      let fallbackClusterIndex = 0;
      let fallbackScore = Infinity;
      for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
        const score = humanSimilarityScore(word, clusters[clusterIndex][0]);
        if (score < fallbackScore) {
          fallbackScore = score;
          fallbackClusterIndex = clusterIndex;
        }
      }
      clusters[fallbackClusterIndex].push(word);
      assigned.add(word);
    }
  }

  clusters.forEach((clusterWords) => {
    const sortedCluster = [...clusterWords].sort((a, b) => a.localeCompare(b));
    const firstLetter = sortedCluster[0].charAt(0).toUpperCase();
    const clusterName = sortedCluster.length > 2 
      ? `${firstLetter}: ${sortedCluster[0].slice(0, 4)}~` 
      : `${firstLetter}: ${sortedCluster.join(', ')}`;
    
    for (const word of clusterWords) {
      clusterMap.set(word, clusterName);
    }
  });

  return clusterMap;
}

export function computeRhymeClusters(words: WordCloudItem[]): Map<string, string> {
  const clusterMap = new Map<string, string>();
  if (words.length === 0) return clusterMap;

  const rhymeGroups: Map<string, string[]> = new Map();
  
  for (const word of words) {
    const ending = word.text.toLowerCase().slice(-2);
    if (!rhymeGroups.has(ending)) {
      rhymeGroups.set(ending, []);
    }
    rhymeGroups.get(ending)!.push(word.text);
  }

  for (const [ending, groupWords] of rhymeGroups.entries()) {
    const rhymeName = `🎤 -${ending.toUpperCase()}`;
    for (const word of groupWords) {
      clusterMap.set(word, rhymeName);
    }
  }

  return clusterMap;
}

export type ClusterCriteria = 'category' | 'alphabetical' | 'type' | 'length' | 'similarity' | 'rhyme' | 'cefr' | 'gender' | 'frequency' | 'compound';

export interface ForceConfig {
  clusterStrength: number;
  chargeStrength: number;
  centerStrength: number;
  collisionStrength: number;
  alphaDecay: number;
  velocityDecay: number;
}

export const DEFAULT_FORCE_CONFIG: ForceConfig = {
  clusterStrength: 0.08,
  chargeStrength: -120,
  centerStrength: 0.02,
  collisionStrength: 1.0,
  alphaDecay: 0.005,
  velocityDecay: 0.4,
};

export const RHYME_FORCE_CONFIG: ForceConfig = {
  clusterStrength: 0.15,
  chargeStrength: -180,
  centerStrength: 0.01,
  collisionStrength: 1.0,
  alphaDecay: 0.005,
  velocityDecay: 0.35,
};

export function getForceConfig(criteria: string): ForceConfig {
  if (criteria === 'rhyme') {
    return RHYME_FORCE_CONFIG;
  }
  return DEFAULT_FORCE_CONFIG;
}
