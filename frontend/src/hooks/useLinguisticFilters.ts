/**
 * useLinguisticFilters - reusable hook for linguistic filtering/grouping.
 * 
 * This hook centralizes linguistic categorization logic so D3 components
 * can reuse it consistently (ClusteredNodes, FunSentenceBuilder, HierarchySunburst, etc.).
 */
import { useState, useMemo, useCallback } from 'react';
import { 
  GraduationCap, 
  Users, 
  Activity, 
  GitCompare, 
  Layers, 
  Hash, 
  Type, 
  Ruler,
  Mic2,
  MessageSquare,
  BookOpen,
  Sparkles,
  Globe
} from 'lucide-react';
import type { WordCloudItem } from '../types';

export type LinguisticCriteria = 
  | 'category' 
  | 'cefr' 
  | 'gender' 
  | 'frequency' 
  | 'register'
  | 'thematic_domain'
  | 'part_of_speech'
  | 'compound'
  | 'difficulty'
  | 'alphabetical' 
  | 'length' 
  | 'similarity' 
  | 'rhyme';

export interface LinguisticFilterConfig {
  id: LinguisticCriteria;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
  getGroup: (word: WordCloudItem) => string;
  color?: string;
}

const GENDER_LABELS: Record<string, string> = {
  masculine: 'der (masculine)',
  feminine: 'die (feminine)',
  neuter: 'das (neuter)',
  m: 'der (masculine)',
  f: 'die (feminine)',
  n: 'das (neuter)',
};

const CEFR_LABELS: Record<string, string> = {
  A1: 'A1 - Beginner',
  A2: 'A2 - Elementary',
  B1: 'B1 - Intermediate',
  B2: 'B2 - Upper intermediate',
  C1: 'C1 - Advanced',
  C2: 'C2 - Near native',
};

const FREQUENCY_LABELS: Record<string, string> = {
  very_common: 'Very common',
  common: 'Common',
  moderate: 'Moderate',
  rare: 'Rare',
  archaic: 'Archaic',
};

const REGISTER_LABELS: Record<string, string> = {
  formal: 'Formal',
  neutral: 'Neutral',
  informal: 'Informal',
  colloquial: 'Colloquial',
  slang: '🔥 Slang',
  literary: 'Literary',
  technical: 'Technical',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  very_hard: 'Very hard',
};

const POS_LABELS: Record<string, string> = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  preposition: 'Preposition',
  conjunction: 'Conjunction',
  pronoun: 'Pronoun',
  article: 'Article',
  interjection: 'Interjection',
};

export const LINGUISTIC_FILTER_CONFIGS: LinguisticFilterConfig[] = [
  {
    id: 'category',
    label: 'Category',
    icon: Layers,
    description: 'Group by semantic category',
    color: '#3b82f6',
    getGroup: (word) => word.category ? word.category : 'Uncategorized',
  },
  {
    id: 'cefr',
    label: 'CEFR Level',
    icon: GraduationCap,
    description: 'Group by language level',
    color: '#8b5cf6',
    getGroup: (word) => {
      const level = word.cefr_level?.toUpperCase();
      return level ? (CEFR_LABELS[level] || level) : 'Unclassified';
    },
  },
  {
    id: 'gender',
    label: 'Gender (der/die/das)',
    icon: Users,
    description: 'Group by grammatical gender',
    color: '#ec4899',
    getGroup: (word) => {
      const gender = word.gender?.toLowerCase();
      return gender ? (GENDER_LABELS[gender] || gender) : 'No gender';
    },
  },
  {
    id: 'frequency',
    label: 'Frequency',
    icon: Activity,
    description: 'Group by usage frequency',
    color: '#f59e0b',
    getGroup: (word) => {
      const freq = word.frequency_band?.toLowerCase();
      return freq ? (FREQUENCY_LABELS[freq] || freq.replace('_', ' ')) : 'Unclassified';
    },
  },
  {
    id: 'register',
    label: 'Register',
    icon: MessageSquare,
    description: 'Group by language register (formal/informal)',
    color: '#14b8a6',
    getGroup: (word) => {
      const reg = word.register?.toLowerCase();
      return reg ? (REGISTER_LABELS[reg] || reg) : 'Not specified';
    },
  },
  {
    id: 'thematic_domain',
    label: 'Thematic Domain',
    icon: Globe,
    description: 'Group by specific thematic area',
    color: '#06b6d4',
    getGroup: (word) => {
      return word.thematic_domain ? word.thematic_domain : 'Not specified';
    },
  },
  {
    id: 'part_of_speech',
    label: 'Part of Speech',
    icon: BookOpen,
    description: 'Group by grammatical function',
    color: '#ef4444',
    getGroup: (word) => {
      if (word.part_of_speech) {
        const pos = word.part_of_speech.toLowerCase();
        return POS_LABELS[pos] || word.part_of_speech;
      }
      const category = word.category?.toLowerCase() || '';
      if (category === 'verbs' || category.includes('verb')) return POS_LABELS.verb;
      if (category === 'adjectives') return POS_LABELS.adjective;
      return POS_LABELS.noun;
    },
  },
  {
    id: 'compound',
    label: 'Compound/Simple',
    icon: GitCompare,
    description: 'Group compound words vs simple words',
    color: '#84cc16',
    getGroup: (word) => {
      if (word.is_compound === true) return 'Compound words';
      if (word.is_compound === false) return 'Simple words';
      if (word.word_formation === 'compound') return 'Compound words';
      if (word.word_formation === 'simple') return 'Simple words';
      return 'Unclassified';
    },
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    icon: Sparkles,
    description: 'Group by difficulty level',
    color: '#f97316',
    getGroup: (word) => {
      const diff = (word as any).difficulty?.toLowerCase();
      return diff ? (DIFFICULTY_LABELS[diff] || diff) : 'Not specified';
    },
  },
  {
    id: 'alphabetical',
    label: 'Alphabetical',
    icon: Hash,
    description: 'Group by initial letter',
    color: '#64748b',
    getGroup: (word) => {
      const firstLetter = word.text.charAt(0).toUpperCase();
      if (firstLetter <= 'F') return '🔤 A-F';
      if (firstLetter <= 'L') return '🔤 G-L';
      if (firstLetter <= 'R') return '🔤 M-R';
      return '🔤 S-Z';
    },
  },
  {
    id: 'length',
    label: 'Length',
    icon: Ruler,
    description: 'Group by word length',
    color: '#a855f7',
    getGroup: (word) => {
      const length = word.text.length;
      if (length <= 4) return 'Short (1-4)';
      if (length <= 7) return 'Medium (5-7)';
      return 'Long (8+)';
    },
  },
  {
    id: 'similarity',
    label: 'Similarity',
    icon: Type,
    description: 'Group similar words',
    color: '#0ea5e9',
    getGroup: () => 'default',
  },
  {
    id: 'rhyme',
    label: 'Rap Mode 🎤',
    icon: Mic2,
    description: 'Group rhyming words',
    color: '#d946ef',
    getGroup: () => 'default',
  },
];

export interface UseLinguisticFiltersOptions {
  defaultCriteria?: LinguisticCriteria;
  enabledCriteria?: LinguisticCriteria[];
}

export interface UseLinguisticFiltersReturn {
  activeCriteria: LinguisticCriteria;
  setActiveCriteria: (criteria: LinguisticCriteria) => void;
  availableConfigs: LinguisticFilterConfig[];
  activeConfig: LinguisticFilterConfig | undefined;
  getGroupForWord: (word: WordCloudItem) => string;
  groupWords: (words: WordCloudItem[]) => Map<string, WordCloudItem[]>;
  getGroupColor: (groupName: string, index: number) => string;
  filterWordsByGroup: (words: WordCloudItem[], groupName: string) => WordCloudItem[];
}

const GROUP_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#a855f7', '#0ea5e9', '#d946ef', '#6366f1', '#22c55e',
];

export function useLinguisticFilters(options: UseLinguisticFiltersOptions = {}): UseLinguisticFiltersReturn {
  const { 
    defaultCriteria = 'category',
    enabledCriteria 
  } = options;

  const [activeCriteria, setActiveCriteria] = useState<LinguisticCriteria>(defaultCriteria);

  const availableConfigs = useMemo(() => {
    if (enabledCriteria) {
      return LINGUISTIC_FILTER_CONFIGS.filter(config => enabledCriteria.includes(config.id));
    }
    return LINGUISTIC_FILTER_CONFIGS;
  }, [enabledCriteria]);

  const activeConfig = useMemo(() => {
    return availableConfigs.find(config => config.id === activeCriteria);
  }, [activeCriteria, availableConfigs]);

  const getGroupForWord = useCallback((word: WordCloudItem): string => {
    if (!activeConfig) return 'default';
    return activeConfig.getGroup(word);
  }, [activeConfig]);

  const groupWords = useCallback((words: WordCloudItem[]): Map<string, WordCloudItem[]> => {
    const groups = new Map<string, WordCloudItem[]>();
    
    for (const word of words) {
      const group = getGroupForWord(word);
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(word);
    }
    
    return groups;
  }, [getGroupForWord]);

  const getGroupColor = useCallback((groupName: string, index: number): string => {
    const hash = groupName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return GROUP_COLORS[(hash + index) % GROUP_COLORS.length];
  }, []);

  const filterWordsByGroup = useCallback((words: WordCloudItem[], groupName: string): WordCloudItem[] => {
    return words.filter(word => getGroupForWord(word) === groupName);
  }, [getGroupForWord]);

  return {
    activeCriteria,
    setActiveCriteria,
    availableConfigs,
    activeConfig,
    getGroupForWord,
    groupWords,
    getGroupColor,
    filterWordsByGroup,
  };
}

export function getFilterConfigById(id: LinguisticCriteria): LinguisticFilterConfig | undefined {
  return LINGUISTIC_FILTER_CONFIGS.find(config => config.id === id);
}

export { CEFR_LABELS, GENDER_LABELS, FREQUENCY_LABELS, REGISTER_LABELS, POS_LABELS, DIFFICULTY_LABELS };
