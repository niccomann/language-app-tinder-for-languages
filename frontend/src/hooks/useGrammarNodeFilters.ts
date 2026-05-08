/**
 * useGrammarNodeFilters - hook for filtering GrammarNode items.
 * 
 * Specialized version of the linguistic filtering system for grammar nodes
 * used in FunSentenceBuilder and SentenceBuilder.
 */
import { useState, useMemo, useCallback } from 'react';
import { 
  GraduationCap, 
  Activity, 
  Users,
  MessageSquare,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import type { GrammarNode } from '../types';

export type GrammarFilterCriteria = 
  | 'all'
  | 'cefr' 
  | 'gender' 
  | 'frequency' 
  | 'register'
  | 'difficulty'
  | 'category';

export interface GrammarFilterConfig {
  id: GrammarFilterCriteria;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
  getOptions: (nodes: GrammarNode[]) => string[];
  matchesFilter: (node: GrammarNode, filterValue: string) => boolean;
}

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const FREQUENCY_ORDER = ['very_common', 'common', 'moderate', 'rare', 'archaic'];
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'very_hard'];

export const GRAMMAR_FILTER_CONFIGS: GrammarFilterConfig[] = [
  {
    id: 'all',
    label: 'All',
    icon: Filter,
    description: 'Show all nodes',
    getOptions: () => ['all'],
    matchesFilter: () => true,
  },
  {
    id: 'cefr',
    label: 'CEFR Level',
    icon: GraduationCap,
    description: 'Filter by language level',
    getOptions: (nodes) => {
      const levels = new Set(nodes.map(n => n.cefr_level).filter(Boolean) as string[]);
      return CEFR_ORDER.filter(level => levels.has(level));
    },
    matchesFilter: (node, filterValue) => node.cefr_level?.toUpperCase() === filterValue.toUpperCase(),
  },
  {
    id: 'gender',
    label: 'Gender',
    icon: Users,
    description: 'Filter by grammatical gender',
    getOptions: (nodes) => {
      const genders = new Set<string>();
      nodes.forEach(n => {
        if (n.meta?.gender) genders.add(n.meta.gender);
      });
      return Array.from(genders);
    },
    matchesFilter: (node, filterValue) => node.meta?.gender?.toLowerCase() === filterValue.toLowerCase(),
  },
  {
    id: 'frequency',
    label: 'Frequency',
    icon: Activity,
    description: 'Filter by usage frequency',
    getOptions: (nodes) => {
      const freqs = new Set(nodes.map(n => n.frequency_band).filter(Boolean) as string[]);
      return FREQUENCY_ORDER.filter(freq => freqs.has(freq));
    },
    matchesFilter: (node, filterValue) => node.frequency_band?.toLowerCase() === filterValue.toLowerCase(),
  },
  {
    id: 'register',
    label: 'Register',
    icon: MessageSquare,
    description: 'Filter by language register',
    getOptions: (nodes) => {
      const regs = new Set(nodes.map(n => n.register).filter(Boolean) as string[]);
      return Array.from(regs);
    },
    matchesFilter: (node, filterValue) => node.register?.toLowerCase() === filterValue.toLowerCase(),
  },
  {
    id: 'difficulty',
    label: 'Difficulty',
    icon: Sparkles,
    description: 'Filter by difficulty',
    getOptions: (nodes) => {
      const diffs = new Set(nodes.map(n => n.difficulty).filter(Boolean) as string[]);
      return DIFFICULTY_ORDER.filter(diff => diffs.has(diff));
    },
    matchesFilter: (node, filterValue) => node.difficulty?.toLowerCase() === filterValue.toLowerCase(),
  },
  {
    id: 'category',
    label: 'Category',
    icon: Layers,
    description: 'Filter by semantic category',
    getOptions: (nodes) => {
      const cats = new Set(nodes.map(n => n.category).filter(Boolean) as string[]);
      return Array.from(cats).sort();
    },
    matchesFilter: (node, filterValue) => node.category?.toLowerCase() === filterValue.toLowerCase(),
  },
];

export interface UseGrammarNodeFiltersOptions {
  nodes: GrammarNode[];
}

export interface UseGrammarNodeFiltersReturn {
  activeCriteria: GrammarFilterCriteria;
  setActiveCriteria: (criteria: GrammarFilterCriteria) => void;
  activeFilterValue: string | null;
  setActiveFilterValue: (value: string | null) => void;
  availableConfigs: GrammarFilterConfig[];
  activeConfig: GrammarFilterConfig | undefined;
  availableOptions: string[];
  filteredNodes: GrammarNode[];
  hasActiveFilter: boolean;
  clearFilters: () => void;
}

export function useGrammarNodeFilters({ nodes }: UseGrammarNodeFiltersOptions): UseGrammarNodeFiltersReturn {
  const [activeCriteria, setActiveCriteria] = useState<GrammarFilterCriteria>('all');
  const [activeFilterValue, setActiveFilterValue] = useState<string | null>(null);

  const availableConfigs = useMemo(() => {
    return GRAMMAR_FILTER_CONFIGS.filter(config => {
      if (config.id === 'all') return true;
      const options = config.getOptions(nodes);
      return options.length > 0;
    });
  }, [nodes]);

  const activeConfig = useMemo(() => {
    return availableConfigs.find(config => config.id === activeCriteria);
  }, [activeCriteria, availableConfigs]);

  const availableOptions = useMemo(() => {
    if (!activeConfig || activeCriteria === 'all') return [];
    return activeConfig.getOptions(nodes);
  }, [activeConfig, activeCriteria, nodes]);

  const filteredNodes = useMemo(() => {
    if (activeCriteria === 'all' || !activeFilterValue || !activeConfig) {
      return nodes;
    }
    return nodes.filter(node => activeConfig.matchesFilter(node, activeFilterValue));
  }, [nodes, activeCriteria, activeFilterValue, activeConfig]);

  const hasActiveFilter = activeCriteria !== 'all' && activeFilterValue !== null;

  const clearFilters = useCallback(() => {
    setActiveCriteria('all');
    setActiveFilterValue(null);
  }, []);

  const handleSetActiveCriteria = useCallback((criteria: GrammarFilterCriteria) => {
    setActiveCriteria(criteria);
    setActiveFilterValue(null);
  }, []);

  return {
    activeCriteria,
    setActiveCriteria: handleSetActiveCriteria,
    activeFilterValue,
    setActiveFilterValue,
    availableConfigs,
    activeConfig,
    availableOptions,
    filteredNodes,
    hasActiveFilter,
    clearFilters,
  };
}

export function formatFilterLabel(criteria: GrammarFilterCriteria, value: string): string {
  switch (criteria) {
    case 'cefr':
      return `🎓 ${value}`;
    case 'gender':
      if (value === 'masculine' || value === 'm') return '🔵 der';
      if (value === 'feminine' || value === 'f') return '🔴 die';
      if (value === 'neuter' || value === 'n') return '🟢 das';
      return value;
    case 'frequency':
      if (value === 'very_common') return '⭐⭐⭐';
      if (value === 'common') return '⭐⭐';
      if (value === 'moderate') return '⭐';
      if (value === 'rare') return '💎';
      if (value === 'archaic') return '📜';
      return value;
    case 'difficulty':
      if (value === 'easy') return '🟢 Facile';
      if (value === 'medium') return '🟡 Medio';
      if (value === 'hard') return '🔴 Difficile';
      if (value === 'very_hard') return '💀 Molto difficile';
      return value;
    default:
      return value;
  }
}
