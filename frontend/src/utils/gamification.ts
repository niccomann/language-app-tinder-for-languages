/**
 * Gamification System - XP, Levels, Achievements
 * Purely visual/presentational - doesn't affect existing logic
 */

export interface UserGameStats {
  totalWordsLearned: number;
  currentStreak: number;
  bestStreak: number;
  perfectSessions: number;
  grammarChallengesCompleted: number;
  videosWatched: number;
  totalSwipes: number;
  accuracy: number;
}

export interface Level {
  level: number;
  title: string;
  xpRequired: number;
  color: string;
  icon: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: (stats: UserGameStats) => boolean;
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Novice', xpRequired: 0, color: '#94a3b8', icon: '🌱' },
  { level: 2, title: 'Apprentice', xpRequired: 100, color: '#22c55e', icon: '🌿' },
  { level: 3, title: 'Student', xpRequired: 300, color: '#3b82f6', icon: '📚' },
  { level: 4, title: 'Scholar', xpRequired: 600, color: '#8b5cf6', icon: '🎓' },
  { level: 5, title: 'Linguist', xpRequired: 1000, color: '#f59e0b', icon: '🗣️' },
  { level: 6, title: 'Polyglot', xpRequired: 1500, color: '#ec4899', icon: '🌍' },
  { level: 7, title: 'Master', xpRequired: 2200, color: '#ef4444', icon: '👑' },
  { level: 8, title: 'Legend', xpRequired: 3000, color: '#fbbf24', icon: '⚡' },
  { level: 9, title: 'Oracle', xpRequired: 4000, color: '#06b6d4', icon: '🔮' },
  { level: 10, title: 'Deity', xpRequired: 5500, color: '#a855f7', icon: '🌟' },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_word',
    name: 'First Steps',
    description: 'Learn your first word',
    icon: '🎯',
    rarity: 'common',
    condition: (s) => s.totalWordsLearned >= 1,
  },
  {
    id: 'ten_words',
    name: 'Word Collector',
    description: 'Learn 10 words',
    icon: '📖',
    rarity: 'common',
    condition: (s) => s.totalWordsLearned >= 10,
  },
  {
    id: 'fifty_words',
    name: 'Vocabulary Builder',
    description: 'Learn 50 words',
    icon: '📚',
    rarity: 'rare',
    condition: (s) => s.totalWordsLearned >= 50,
  },
  {
    id: 'hundred_words',
    name: 'Century',
    description: 'Learn 100 words',
    icon: '💯',
    rarity: 'epic',
    condition: (s) => s.totalWordsLearned >= 100,
  },
  {
    id: 'streak_3',
    name: 'On Fire',
    description: 'Get a 3-day streak',
    icon: '🔥',
    rarity: 'common',
    condition: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Unstoppable',
    description: 'Get a 7-day streak',
    icon: '🚀',
    rarity: 'rare',
    condition: (s) => s.bestStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Dedicated',
    description: 'Get a 30-day streak',
    icon: '🏆',
    rarity: 'legendary',
    condition: (s) => s.bestStreak >= 30,
  },
  {
    id: 'perfect_session',
    name: 'Perfectionist',
    description: 'Complete a session with 100% accuracy',
    icon: '✨',
    rarity: 'rare',
    condition: (s) => s.perfectSessions >= 1,
  },
  {
    id: 'grammar_master',
    name: 'Grammar Guru',
    description: 'Complete 10 grammar challenges',
    icon: '🧪',
    rarity: 'epic',
    condition: (s) => s.grammarChallengesCompleted >= 10,
  },
  {
    id: 'video_watcher',
    name: 'Cinephile',
    description: 'Watch 20 learning videos',
    icon: '🎬',
    rarity: 'rare',
    condition: (s) => s.videosWatched >= 20,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Review 50 cards in one session',
    icon: '⚡',
    rarity: 'epic',
    condition: (s) => s.totalSwipes >= 50,
  },
  {
    id: 'accuracy_king',
    name: 'Sharp Mind',
    description: 'Maintain 90% accuracy over 100 swipes',
    icon: '🧠',
    rarity: 'legendary',
    condition: (s) => s.totalSwipes >= 100 && s.accuracy >= 90,
  },
];

export const RARITY_COLORS = {
  common: { bg: '#64748b', glow: '#94a3b8' },
  rare: { bg: '#3b82f6', glow: '#60a5fa' },
  epic: { bg: '#a855f7', glow: '#c084fc' },
  legendary: { bg: '#f59e0b', glow: '#fbbf24' },
};

export function calculateLevel(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getXpForNextLevel(xp: number): { current: number; required: number; progress: number } {
  const currentLevel = calculateLevel(xp);
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  
  if (!nextLevel) {
    return { current: xp, required: xp, progress: 100 };
  }
  
  const levelBaseXp = currentLevel.xpRequired;
  const xpIntoLevel = xp - levelBaseXp;
  const xpNeededForLevel = nextLevel.xpRequired - levelBaseXp;
  const progress = Math.min(100, Math.round((xpIntoLevel / xpNeededForLevel) * 100));
  
  return {
    current: xpIntoLevel,
    required: xpNeededForLevel,
    progress,
  };
}

export function calculateXpGain(action: 'correct' | 'wrong' | 'video_complete' | 'grammar_challenge'): number {
  switch (action) {
    case 'correct': return 10;
    case 'wrong': return 5;
    case 'video_complete': return 15;
    case 'grammar_challenge': return 25;
    default: return 0;
  }
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 2.5;
  if (combo >= 7) return 2;
  if (combo >= 5) return 1.5;
  if (combo >= 3) return 1.25;
  return 1;
}

export function checkAchievements(stats: UserGameStats, unlockedIds: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !unlockedIds.includes(a.id) && a.condition(stats)
  );
}

// Category themes for game-like visuals
export const CATEGORY_THEMES: Record<string, { color: string; glow: string; bg: string; sound: string }> = {
  animals: { color: '#f97316', glow: '#fdba74', bg: 'from-orange-500/20 to-red-500/20', sound: '🦁' },
  food: { color: '#22c55e', glow: '#86efac', bg: 'from-green-500/20 to-emerald-500/20', sound: '🍎' },
  objects: { color: '#3b82f6', glow: '#93c5fd', bg: 'from-blue-500/20 to-cyan-500/20', sound: '📱' },
  actions: { color: '#ef4444', glow: '#fca5a5', bg: 'from-red-500/20 to-pink-500/20', sound: '🏃' },
  nature: { color: '#10b981', glow: '#6ee7b7', bg: 'from-emerald-500/20 to-teal-500/20', sound: '🌳' },
  colors: { color: '#a855f7', glow: '#d8b4fe', bg: 'from-purple-500/20 to-violet-500/20', sound: '🎨' },
  body: { color: '#f43f5e', glow: '#fda4af', bg: 'from-rose-500/20 to-pink-500/20', sound: '👤' },
  weather: { color: '#06b6d4', glow: '#67e8f9', bg: 'from-cyan-500/20 to-sky-500/20', sound: '☁️' },
  clothing: { color: '#8b5cf6', glow: '#c4b5fd', bg: 'from-violet-500/20 to-purple-500/20', sound: '👕' },
  transportation: { color: '#f59e0b', glow: '#fcd34d', bg: 'from-amber-500/20 to-yellow-500/20', sound: '🚗' },
  family: { color: '#ec4899', glow: '#f9a8d4', bg: 'from-pink-500/20 to-rose-500/20', sound: '👨‍👩‍👧' },
  time: { color: '#6366f1', glow: '#a5b4fc', bg: 'from-indigo-500/20 to-blue-500/20', sound: '⏰' },
  music: { color: '#d946ef', glow: '#e879f9', bg: 'from-fuchsia-500/20 to-pink-500/20', sound: '🎵' },
  sports: { color: '#84cc16', glow: '#bef264', bg: 'from-lime-500/20 to-green-500/20', sound: '⚽' },
  places: { color: '#14b8a6', glow: '#5eead4', bg: 'from-teal-500/20 to-cyan-500/20', sound: '🏙️' },
  verbs: { color: '#e11d48', glow: '#fda4af', bg: 'from-rose-600/20 to-red-500/20', sound: '✍️' },
  adjectives: { color: '#fbbf24', glow: '#fde68a', bg: 'from-yellow-500/20 to-amber-500/20', sound: '⭐' },
};

// Game-like sound effects (visual feedback)
export const SOUND_EFFECTS = {
  correct: { emoji: '✅', color: '#22c55e', shake: false },
  wrong: { emoji: '❌', color: '#ef4444', shake: true },
  levelUp: { emoji: '🎉', color: '#fbbf24', shake: false },
  achievement: { emoji: '🏆', color: '#a855f7', shake: false },
  combo: { emoji: '🔥', color: '#f97316', shake: false },
  streak: { emoji: '⚡', color: '#fbbf24', shake: false },
};
