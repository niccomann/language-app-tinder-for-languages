/**
 * useLinguisticFilters - Hook riutilizzabile per filtering/grouping linguistico
 * 
 * Questo hook centralizza tutta la logica di categorizzazione linguistica
 * per renderla riutilizzabile in tutti i componenti D3 (ClusteredNodes, 
 * FunSentenceBuilder, HierarchySunburst, etc.)
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
  masculine: '🔵 der (maschile)',
  feminine: '🔴 die (femminile)',
  neuter: '🟢 das (neutro)',
  m: '🔵 der (maschile)',
  f: '🔴 die (femminile)',
  n: '🟢 das (neutro)',
};

const CEFR_LABELS: Record<string, string> = {
  A1: '🌱 A1 - Principiante',
  A2: '🌿 A2 - Elementare',
  B1: '🌳 B1 - Intermedio',
  B2: '🌲 B2 - Intermedio+',
  C1: '🏔️ C1 - Avanzato',
  C2: '🎓 C2 - Madrelingua',
};

const FREQUENCY_LABELS: Record<string, string> = {
  very_common: '⭐⭐⭐ Molto comune',
  common: '⭐⭐ Comune',
  moderate: '⭐ Moderato',
  rare: '💎 Raro',
  archaic: '📜 Arcaico',
};

const REGISTER_LABELS: Record<string, string> = {
  formal: '🎩 Formale',
  neutral: '📝 Neutro',
  informal: '👋 Informale',
  colloquial: '💬 Colloquiale',
  slang: '🔥 Slang',
  literary: '📚 Letterario',
  technical: '⚙️ Tecnico',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '🟢 Facile',
  medium: '🟡 Medio',
  hard: '🔴 Difficile',
  very_hard: '💀 Molto difficile',
};

const POS_LABELS: Record<string, string> = {
  noun: '🔵 Sostantivo',
  verb: '🔴 Verbo',
  adjective: '🟠 Aggettivo',
  adverb: '🟣 Avverbio',
  preposition: '🟤 Preposizione',
  conjunction: '⚪ Congiunzione',
  pronoun: '🟡 Pronome',
  article: '⬜ Articolo',
  interjection: '❗ Interiezione',
};

export const LINGUISTIC_FILTER_CONFIGS: LinguisticFilterConfig[] = [
  {
    id: 'category',
    label: 'Categoria',
    icon: Layers,
    description: 'Raggruppa per categoria semantica',
    color: '#3b82f6',
    getGroup: (word) => word.category ? `📦 ${word.category}` : '❓ Senza categoria',
  },
  {
    id: 'cefr',
    label: 'Livello CEFR',
    icon: GraduationCap,
    description: 'Raggruppa per livello linguistico',
    color: '#8b5cf6',
    getGroup: (word) => {
      const level = word.cefr_level?.toUpperCase();
      return level ? (CEFR_LABELS[level] || `📊 ${level}`) : '❓ Non classificato';
    },
  },
  {
    id: 'gender',
    label: 'Genere (der/die/das)',
    icon: Users,
    description: 'Raggruppa per genere grammaticale',
    color: '#ec4899',
    getGroup: (word) => {
      const gender = word.gender?.toLowerCase();
      return gender ? (GENDER_LABELS[gender] || gender) : '❓ Senza genere';
    },
  },
  {
    id: 'frequency',
    label: 'Frequenza',
    icon: Activity,
    description: 'Raggruppa per frequenza d\'uso',
    color: '#f59e0b',
    getGroup: (word) => {
      const freq = word.frequency_band?.toLowerCase();
      return freq ? (FREQUENCY_LABELS[freq] || freq.replace('_', ' ')) : '❓ Non classificato';
    },
  },
  {
    id: 'register',
    label: 'Registro',
    icon: MessageSquare,
    description: 'Raggruppa per registro linguistico (formale/informale)',
    color: '#14b8a6',
    getGroup: (word) => {
      const reg = word.register?.toLowerCase();
      return reg ? (REGISTER_LABELS[reg] || `📝 ${reg}`) : '❓ Non specificato';
    },
  },
  {
    id: 'thematic_domain',
    label: 'Dominio Tematico',
    icon: Globe,
    description: 'Raggruppa per area tematica specifica',
    color: '#06b6d4',
    getGroup: (word) => {
      return word.thematic_domain ? `🎯 ${word.thematic_domain}` : '❓ Non specificato';
    },
  },
  {
    id: 'part_of_speech',
    label: 'Parte del Discorso',
    icon: BookOpen,
    description: 'Raggruppa per funzione grammaticale',
    color: '#ef4444',
    getGroup: (word) => {
      if (word.part_of_speech) {
        const pos = word.part_of_speech.toLowerCase();
        return POS_LABELS[pos] || `📝 ${word.part_of_speech}`;
      }
      const category = word.category?.toLowerCase() || '';
      if (category === 'verbs' || category.includes('verb')) return POS_LABELS.verb;
      if (category === 'adjectives') return POS_LABELS.adjective;
      return POS_LABELS.noun;
    },
  },
  {
    id: 'compound',
    label: 'Composte/Semplici',
    icon: GitCompare,
    description: 'Raggruppa parole composte vs semplici',
    color: '#84cc16',
    getGroup: (word) => {
      if (word.is_compound === true) return '🔗 Parole Composte';
      if (word.is_compound === false) return '📝 Parole Semplici';
      if (word.word_formation === 'compound') return '🔗 Parole Composte';
      if (word.word_formation === 'simple') return '📝 Parole Semplici';
      return '❓ Non classificato';
    },
  },
  {
    id: 'difficulty',
    label: 'Difficoltà',
    icon: Sparkles,
    description: 'Raggruppa per livello di difficoltà',
    color: '#f97316',
    getGroup: (word) => {
      const diff = (word as any).difficulty?.toLowerCase();
      return diff ? (DIFFICULTY_LABELS[diff] || `⭐ ${diff}`) : '❓ Non specificato';
    },
  },
  {
    id: 'alphabetical',
    label: 'Alfabetico',
    icon: Hash,
    description: 'Raggruppa per lettera iniziale',
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
    label: 'Lunghezza',
    icon: Ruler,
    description: 'Raggruppa per lunghezza parola',
    color: '#a855f7',
    getGroup: (word) => {
      const length = word.text.length;
      if (length <= 4) return '📏 Corte (1-4)';
      if (length <= 7) return '📏 Medie (5-7)';
      return '📏 Lunghe (8+)';
    },
  },
  {
    id: 'similarity',
    label: 'Similarità',
    icon: Type,
    description: 'Raggruppa parole simili',
    color: '#0ea5e9',
    getGroup: () => 'default',
  },
  {
    id: 'rhyme',
    label: 'Rap Mode 🎤',
    icon: Mic2,
    description: 'Raggruppa parole che fanno rima',
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
