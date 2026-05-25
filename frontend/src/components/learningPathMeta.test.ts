import { describe, expect, test } from 'vitest';
import {
  MILESTONE_LEVELS,
  buildLearningRoadmapSteps,
  buildLearningRoadmapStepsFromMissions,
  getCefrLevelForPathLevel,
  getCefrPathPhaseForLevel,
  getUnlockedCefrLevelsForPathLevel,
  type LearningPathMilestone,
} from './learningPathMeta';

const milestones: LearningPathMilestone[] = [
  { level: 1, title: 'Placement', detail: 'First signal.' },
  { level: 25, title: 'Core Words', detail: 'Build a base.' },
  { level: 50, title: 'Phrase Ready', detail: 'Mix into sentences.' },
  { level: 100, title: 'Context Builder', detail: 'Review in context.' },
];

describe('buildLearningRoadmapSteps', () => {
  test('marks past, active, next, and locked milestones for a Duolingo-style path', () => {
    const steps = buildLearningRoadmapSteps(52, milestones);

    expect(steps.map((step) => [step.level, step.state])).toEqual([
      [1, 'complete'],
      [25, 'complete'],
      [50, 'active'],
      [100, 'upcoming'],
    ]);
  });

  test('alternates roadmap nodes across the road without changing milestone order', () => {
    const steps = buildLearningRoadmapSteps(1, milestones);

    expect(steps.map((step) => [step.level, step.lane, step.y])).toEqual([
      [1, 'center', 14],
      [25, 'right', 30],
      [50, 'left', 46],
      [100, 'right', 62],
    ]);
  });

  test('keeps every 400-level checkpoint inside the visible road canvas', () => {
    const fullMilestones = MILESTONE_LEVELS.map((level) => ({
      level,
      title: `Level ${level}`,
      detail: `Checkpoint ${level}`,
    }));
    const steps = buildLearningRoadmapSteps(7, fullMilestones);

    expect(steps).toHaveLength(7);
    expect(Math.max(...steps.map((step) => step.y))).toBeLessThanOrEqual(92);
  });
});

describe('CEFR mission path', () => {
  test('splits 400 levels into four non-overlapping language phases', () => {
    expect(getCefrPathPhaseForLevel(1)).toMatchObject({ code: 'A1', startLevel: 1, endLevel: 100 });
    expect(getCefrPathPhaseForLevel(100)).toMatchObject({ code: 'A1' });
    expect(getCefrPathPhaseForLevel(101)).toMatchObject({ code: 'A2', startLevel: 101, endLevel: 200 });
    expect(getCefrPathPhaseForLevel(201)).toMatchObject({ code: 'B1', startLevel: 201, endLevel: 300 });
    expect(getCefrPathPhaseForLevel(400)).toMatchObject({ code: 'B2', startLevel: 301, endLevel: 400 });
  });

  test('derives the active and unlocked CEFR difficulty from path level', () => {
    expect(getCefrLevelForPathLevel(2)).toBe('A1');
    expect(getUnlockedCefrLevelsForPathLevel(2)).toEqual(['A1']);
    expect(getCefrLevelForPathLevel(150)).toBe('A2');
    expect(getUnlockedCefrLevelsForPathLevel(150)).toEqual(['A1', 'A2']);
    expect(getCefrLevelForPathLevel(260)).toBe('B1');
    expect(getUnlockedCefrLevelsForPathLevel(260)).toEqual(['A1', 'A2', 'B1']);
    expect(getCefrLevelForPathLevel(380)).toBe('B2');
    expect(getUnlockedCefrLevelsForPathLevel(380)).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  test('turns registered missions into a 400-node scrollable roadmap', () => {
    const missions = Array.from({ length: 400 }, (_, index) => {
      const level = index + 1;
      const phase = getCefrPathPhaseForLevel(level);
      return {
        mission_id: `de-path-level-${String(level).padStart(3, '0')}`,
        level,
        title: `Mission ${level}`,
        detail: `Level ${level} task`,
        objective: `Complete level ${level}`,
        action: 'practice',
        route: '/learn',
        cefr_phase: phase.code,
        phase_label: phase.label,
        phase_start_level: phase.startLevel,
        phase_end_level: phase.endLevel,
        status: level < 7 ? 'completed' as const : level === 7 ? 'available' as const : 'locked' as const,
        completed_at: level < 7 ? '2026-05-24T10:00:00Z' : null,
        progress_value: level < 7 ? 1 : 0,
        target_value: 1,
        is_checkpoint: level % 100 === 0,
      };
    });

    const steps = buildLearningRoadmapStepsFromMissions(missions);

    expect(steps).toHaveLength(400);
    expect(steps[0]).toMatchObject({ level: 1, state: 'complete', cefrPhase: 'A1' });
    expect(steps[6]).toMatchObject({ level: 7, state: 'active', missionStatus: 'available' });
    expect(steps[100]).toMatchObject({ level: 101, state: 'locked', cefrPhase: 'A2' });
    // Nodes are evenly distributed within the canvas with only a half-step
    // margin at top/bottom (no large empty road above the first node).
    expect(Math.min(...steps.map((step) => step.y))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...steps.map((step) => step.y))).toBeLessThanOrEqual(100);
    expect(steps[0].y).toBeLessThan(1);
  });
});
