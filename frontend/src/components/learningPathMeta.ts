import type { AdaptiveLearningSummary } from '../types';

export interface LearningPathMilestone {
  level: number;
  title: string;
  detail: string;
}

export const LEARNING_PATH_MILESTONES: LearningPathMilestone[] = [
  { level: 1, title: 'Placement', detail: 'First signal from known and missed words.' },
  { level: 25, title: 'Core Words', detail: 'Build a stable base for everyday German.' },
  { level: 50, title: 'Phrase Ready', detail: 'Strong words can start mixing into sentences.' },
  { level: 100, title: 'Context Builder', detail: 'Review weaker words inside easier contexts.' },
  { level: 200, title: 'Advanced Recall', detail: 'Most known words move into deeper review.' },
  { level: 300, title: 'Long Run', detail: 'The path keeps expanding without needing hundreds of visible nodes.' },
  { level: 400, title: 'Mastery Review', detail: 'Keep high-confidence words active over time.' },
];

export function getActiveMilestoneIndex(
  level: number,
  milestones: LearningPathMilestone[] = LEARNING_PATH_MILESTONES,
) {
  const nextStepIndex = milestones.findIndex((step) => level < step.level);
  if (nextStepIndex === -1) return milestones.length - 1;
  return Math.max(0, nextStepIndex - 1);
}

export function getLearningTrendLabel(summary: AdaptiveLearningSummary | null) {
  if (!summary || summary.trend === 'new') return 'New path';
  if (summary.trend === 'improving') return `Mastery improving +${summary.level_delta.toFixed(1)}`;
  if (summary.trend === 'declining') return `Mastery needs review ${summary.level_delta.toFixed(1)}`;
  return 'Stable mastery';
}

export function getPathDisplayValues(summary: AdaptiveLearningSummary | null) {
  return {
    averageMastery: summary?.average_knowledge_level ?? 1,
    pathLevel: summary?.path_level ?? 1,
    maxPathLevel: summary?.max_path_level ?? 400,
    xpToNextLevel: summary?.xp_to_next_level ?? 100,
    pathLevelProgress: summary?.path_level_progress ?? 0,
  };
}
