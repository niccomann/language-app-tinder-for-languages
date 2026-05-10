export const CATEGORY_COLORS: Record<string, string> = {
  animals: '#3B82F6',
  food: '#10B981',
  verbs: '#EF4444',
  adjectives: '#F59E0B',
  objects: '#8B5CF6',
  default: '#64748B',
};

export const CEFR_BADGE_CLASSES: Record<string, string> = {
  A1: 'bg-success/10 text-success',
  A2: 'bg-success/20 text-success',
  B1: 'bg-accent-amber/10 text-accent-amber',
  B2: 'bg-accent-amber/20 text-accent-amber',
  C1: 'bg-primary/10 text-primary',
  C2: 'bg-error/10 text-error',
};

export const GENDER_BADGE_META: Record<string, { article: string; color: string }> = {
  masculine: { article: 'der', color: 'bg-primary' },
  feminine: { article: 'die', color: 'bg-accent-amber' },
  neuter: { article: 'das', color: 'bg-accent-teal' },
};

export const FREQUENCY_ICONS: Record<string, string> = {
  very_common: '⭐⭐⭐⭐⭐',
  common: '⭐⭐⭐⭐',
  moderate: '⭐⭐⭐',
  rare: '⭐⭐',
  archaic: '⭐',
};

export const CONFUSION_LEVEL_CLASSES: Record<string, string> = {
  critical: 'bg-error text-on-primary',
  high: 'bg-primary text-on-primary',
  medium: 'bg-accent-amber text-ink',
  low: 'bg-success text-on-primary',
};
