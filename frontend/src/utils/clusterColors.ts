export const DYNAMIC_COLORS = [
  '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const GROUP_COLORS: Record<string, string> = {
  animals: '#3B82F6',
  food: '#10B981',
  verbs: '#EF4444',
  adjectives: '#F59E0B',
  objects: '#8B5CF6',
  nature: '#22C55E',
  colors: '#EC4899',
  body: '#F97316',
  weather: '#06B6D4',
  clothing: '#A855F7',
  transportation: '#6366F1',
  family: '#14B8A6',
  time: '#84CC16',
  music: '#E11D48',
  sports: '#0EA5E9',
  places: '#8B5CF6',
  other: '#64748B',
  
  'A-F': '#3B82F6',
  'G-L': '#10B981',
  'M-R': '#F59E0B',
  'S-Z': '#EF4444',
  
  'Verbi': '#EF4444',
  'Aggettivi': '#F59E0B',
  'Sostantivi': '#3B82F6',
  
  'Corte (1-4)': '#10B981',
  'Medie (5-7)': '#3B82F6',
  'Lunghe (8+)': '#8B5CF6',
  
  default: '#64748B',
};

export function getGroupColor(group: string): string {
  if (group.includes(':') && /^[A-Z]:/.test(group)) {
    const letterCode = group.charCodeAt(0) - 65;
    return DYNAMIC_COLORS[letterCode % DYNAMIC_COLORS.length];
  }
  
  if (group.startsWith('🎤')) {
    const suffixPart = group.replace('🎤 ', '').replace('-', '');
    const hash = suffixPart.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return DYNAMIC_COLORS[hash % DYNAMIC_COLORS.length];
  }
  
  return GROUP_COLORS[group] || GROUP_COLORS.default;
}
