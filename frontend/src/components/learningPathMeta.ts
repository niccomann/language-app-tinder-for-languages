import type { AdaptiveLearningSummary } from '../types';
import { formatCopy, type StaticCopy } from '../i18n/staticCopy';

export interface LearningPathMilestone {
  level: number;
  title: string;
  detail: string;
}

/** Path level thresholds — labels come from i18n (see `getMilestones`). */
export const MILESTONE_LEVELS = [1, 25, 50, 100, 200, 300, 400] as const;

/** Build the milestone list with localized title/detail for the active locale. */
export function getMilestones(copy: StaticCopy): LearningPathMilestone[] {
  return MILESTONE_LEVELS.map((level, i) => ({
    level,
    title: copy.pathHome.milestones[i]?.title ?? '',
    detail: copy.pathHome.milestones[i]?.detail ?? '',
  }));
}

export function getActiveMilestoneIndex(
  level: number,
  milestones: LearningPathMilestone[],
) {
  const nextStepIndex = milestones.findIndex((step) => level < step.level);
  if (nextStepIndex === -1) return milestones.length - 1;
  return Math.max(0, nextStepIndex - 1);
}

export function getLearningTrendLabel(
  summary: AdaptiveLearningSummary | null,
  copy: StaticCopy,
) {
  const t = copy.pathHome.trend;
  if (!summary || summary.trend === 'new') return t.new;
  if (summary.trend === 'improving') {
    return formatCopy(t.improving, { delta: summary.level_delta.toFixed(1) });
  }
  if (summary.trend === 'declining') {
    return formatCopy(t.declining, { delta: summary.level_delta.toFixed(1) });
  }
  return t.stable;
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
