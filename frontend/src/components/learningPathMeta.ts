import type { AdaptiveLearningSummary, CefrLevel, CefrPathPhaseCode, PathMission, PathMissionStatus, PathMissionsResponse } from '../types';
import { formatCopy, type StaticCopy } from '../i18n/staticCopy';

export interface LearningPathMilestone {
  level: number;
  title: string;
  detail: string;
}

export type LearningRoadmapStepState = 'complete' | 'active' | 'upcoming' | 'locked';
export type LearningRoadmapLane = 'left' | 'center' | 'right';

export interface LearningRoadmapStep extends LearningPathMilestone {
  index: number;
  state: LearningRoadmapStepState;
  lane: LearningRoadmapLane;
  x: number;
  y: number;
  missionId?: string;
  missionStatus?: PathMissionStatus;
  cefrPhase?: CefrPathPhaseCode;
  phaseLabel?: string;
  phaseStartLevel?: number;
  phaseEndLevel?: number;
  objective?: string;
  action?: string;
  route?: string;
  progressValue?: number;
  targetValue?: number;
  isCheckpoint?: boolean;
  completedAt?: string | null;
}

/** Path level thresholds — labels come from i18n (see `getMilestones`). */
export const MILESTONE_LEVELS = [1, 25, 50, 100, 200, 300, 400] as const;
export const TOTAL_PATH_LEVELS = 400;

export interface CefrPathPhaseMeta {
  code: CefrPathPhaseCode;
  startLevel: number;
  endLevel: number;
  label: string;
}

export const CEFR_PATH_PHASES: CefrPathPhaseMeta[] = [
  { code: 'A1', startLevel: 1, endLevel: 100, label: 'A1 · Levels 1-100' },
  { code: 'A2', startLevel: 101, endLevel: 200, label: 'A2 · Levels 101-200' },
  { code: 'B1', startLevel: 201, endLevel: 300, label: 'B1 · Levels 201-300' },
  { code: 'B2', startLevel: 301, endLevel: 400, label: 'B2 · Levels 301-400' },
];

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

const ROADMAP_LANES: Array<Pick<LearningRoadmapStep, 'lane' | 'x'>> = [
  { lane: 'center', x: 50 },
  { lane: 'right', x: 72 },
  { lane: 'left', x: 28 },
  { lane: 'right', x: 70 },
  { lane: 'left', x: 30 },
  { lane: 'center', x: 52 },
];

export function buildLearningRoadmapSteps(
  pathLevel: number,
  milestones: LearningPathMilestone[],
): LearningRoadmapStep[] {
  const activeIndex = getActiveMilestoneIndex(pathLevel, milestones);
  const yStep = milestones.length <= 4 ? 16 : 78 / Math.max(1, milestones.length - 1);

  return milestones.map((milestone, index) => {
    const lane = ROADMAP_LANES[index % ROADMAP_LANES.length];
    const state: LearningRoadmapStepState =
      index < activeIndex
        ? 'complete'
        : index === activeIndex
          ? 'active'
          : index === activeIndex + 1
            ? 'upcoming'
            : 'locked';

    return {
      ...milestone,
      index,
      state,
      lane: lane.lane,
      x: lane.x,
      y: 14 + index * yStep,
    };
  });
}

export function getCefrPathPhaseForLevel(level: number): CefrPathPhaseMeta {
  const boundedLevel = Math.max(1, Math.min(TOTAL_PATH_LEVELS, Math.round(level)));
  return CEFR_PATH_PHASES.find(
    (phase) => boundedLevel >= phase.startLevel && boundedLevel <= phase.endLevel,
  ) ?? CEFR_PATH_PHASES[CEFR_PATH_PHASES.length - 1];
}

export function getCefrLevelForPathLevel(level: number): CefrLevel {
  return getCefrPathPhaseForLevel(level).code;
}

export function getUnlockedCefrLevelsForPathLevel(level: number): CefrLevel[] {
  const current = getCefrLevelForPathLevel(level);
  const index = CEFR_PATH_PHASES.findIndex((phase) => phase.code === current);
  return CEFR_PATH_PHASES.slice(0, index + 1).map((phase) => phase.code);
}

function missionStatusToStepState(status: PathMissionStatus): LearningRoadmapStepState {
  if (status === 'completed') return 'complete';
  if (status === 'available') return 'active';
  return 'locked';
}

export function buildLearningRoadmapStepsFromMissions(
  missions: PathMission[],
): LearningRoadmapStep[] {
  // Distribute nodes evenly with a half-step margin top and bottom. A fixed
  // percentage offset (e.g. 4%) does not scale: with hundreds of levels the road
  // canvas is tens of thousands of px tall, so 4% became ~1000px of empty road
  // above the first node. Half-step (~36px) keeps the start node near the top.
  const yStep = 100 / Math.max(1, missions.length);

  return missions.map((mission, index) => {
    const lane = ROADMAP_LANES[index % ROADMAP_LANES.length];

    return {
      level: mission.level,
      title: mission.title,
      detail: mission.detail,
      index,
      state: missionStatusToStepState(mission.status),
      lane: lane.lane,
      x: lane.x,
      y: (index + 0.5) * yStep,
      missionId: mission.mission_id,
      missionStatus: mission.status,
      cefrPhase: mission.cefr_phase,
      phaseLabel: mission.phase_label,
      phaseStartLevel: mission.phase_start_level,
      phaseEndLevel: mission.phase_end_level,
      objective: mission.objective,
      action: mission.action,
      route: mission.route,
      progressValue: mission.progress_value,
      targetValue: mission.target_value,
      isCheckpoint: mission.is_checkpoint,
      completedAt: mission.completed_at,
    };
  });
}

function missionIdForLevel(language: string, level: number) {
  return `${language}-path-level-${String(level).padStart(3, '0')}`;
}

function fallbackMissionCopy(level: number, milestones: LearningPathMilestone[]) {
  const milestone = milestones.find((item) => item.level === level);
  if (milestone) return milestone;

  const cycle = [
    ['Vocabulary Quest', 'Practice the next vocabulary pack.'],
    ['Sound & Recall', 'Recognize words through sound and memory.'],
    ['Sentence Move', 'Place words in the right order.'],
    ['Word Match', 'Match target words with their meaning.'],
    ['Grammar Gate', 'Check how the sentence pieces connect.'],
    ['Review Sprint', 'Stabilize weak words before moving forward.'],
  ] as const;
  const [title, detail] = cycle[(level - 1) % cycle.length];
  return {
    level,
    title: `${title} ${level}`,
    detail,
  };
}

export function buildFallbackPathMissions(
  pathLevel: number,
  milestones: LearningPathMilestone[],
  language: string = 'de',
  completedCountOverride?: number,
): PathMissionsResponse {
  const completedCount = Math.max(
    0,
    Math.min(TOTAL_PATH_LEVELS, completedCountOverride ?? Math.max(0, pathLevel - 1)),
  );
  const currentLevel = completedCount >= TOTAL_PATH_LEVELS ? TOTAL_PATH_LEVELS : completedCount + 1;

  const missions = Array.from({ length: TOTAL_PATH_LEVELS }, (_, index): PathMission => {
    const level = index + 1;
    const phase = getCefrPathPhaseForLevel(level);
    const copy = fallbackMissionCopy(level, milestones);
    const status: PathMissionStatus =
      level <= completedCount
        ? 'completed'
        : level === currentLevel
          ? 'available'
          : 'locked';

    return {
      mission_id: missionIdForLevel(language, level),
      level,
      title: copy.title,
      detail: copy.detail,
      objective: `Complete level ${level} to unlock level ${Math.min(TOTAL_PATH_LEVELS, level + 1)}.`,
      action: 'practice',
      route: '/learn',
      cefr_phase: phase.code,
      phase_label: phase.label,
      phase_start_level: phase.startLevel,
      phase_end_level: phase.endLevel,
      status,
      completed_at: status === 'completed' ? new Date(0).toISOString() : null,
      progress_value: status === 'completed' ? 1 : 0,
      target_value: 1,
      is_checkpoint: MILESTONE_LEVELS.includes(level as typeof MILESTONE_LEVELS[number]) || level % 25 === 0,
    };
  });

  const phases = CEFR_PATH_PHASES.map((phase) => {
    const phaseCompleted = missions.filter(
      (mission) => mission.status === 'completed'
        && mission.level >= phase.startLevel
        && mission.level <= phase.endLevel,
    ).length;
    return {
      code: phase.code,
      start_level: phase.startLevel,
      end_level: phase.endLevel,
      label: phase.label,
      completed_count: phaseCompleted,
      total_count: phase.endLevel - phase.startLevel + 1,
      status: phaseCompleted >= phase.endLevel - phase.startLevel + 1
        ? 'completed' as const
        : currentLevel >= phase.startLevel && currentLevel <= phase.endLevel
          ? 'active' as const
          : 'locked' as const,
    };
  });

  return {
    total_levels: TOTAL_PATH_LEVELS,
    completed_count: completedCount,
    current_level: currentLevel,
    current_mission_id: completedCount >= TOTAL_PATH_LEVELS ? null : missionIdForLevel(language, currentLevel),
    phases,
    missions,
  };
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
