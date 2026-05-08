export const CATEGORY_COLORS: Record<string, string> = {
  animals: '#3B82F6',
  food: '#10B981',
  verbs: '#EF4444',
  adjectives: '#F59E0B',
  objects: '#8B5CF6',
  default: '#64748B',
};

export const CEFR_BADGE_CLASSES: Record<string, string> = {
  A1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  A2: 'bg-green-200 text-green-900 dark:bg-green-800/30 dark:text-green-300',
  B1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  B2: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800/30 dark:text-yellow-300',
  C1: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  C2: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const GENDER_BADGE_META: Record<string, { article: string; color: string }> = {
  masculine: { article: 'der', color: 'bg-blue-500' },
  feminine: { article: 'die', color: 'bg-pink-500' },
  neuter: { article: 'das', color: 'bg-green-500' },
};

export const FREQUENCY_ICONS: Record<string, string> = {
  very_common: '⭐⭐⭐⭐⭐',
  common: '⭐⭐⭐⭐',
  moderate: '⭐⭐⭐',
  rare: '⭐⭐',
  archaic: '⭐',
};

export const CONFUSION_LEVEL_CLASSES: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
};
