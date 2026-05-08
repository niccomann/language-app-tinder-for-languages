import mascotCorrectA from '../assets/gamification/mascot_correct_a.png';
import mascotCorrectB from '../assets/gamification/mascot_correct_b.png';
import mascotExplorerCorrectA from '../assets/gamification/mascot_explorer_correct_a.png';
import mascotExplorerCorrectB from '../assets/gamification/mascot_explorer_correct_b.png';
import mascotExplorerIdleA from '../assets/gamification/mascot_explorer_idle_a.png';
import mascotExplorerIdleB from '../assets/gamification/mascot_explorer_idle_b.png';
import mascotExplorerLevelUpA from '../assets/gamification/mascot_explorer_level_up_a.png';
import mascotExplorerLevelUpB from '../assets/gamification/mascot_explorer_level_up_b.png';
import mascotExplorerWrongA from '../assets/gamification/mascot_explorer_wrong_a.png';
import mascotExplorerWrongB from '../assets/gamification/mascot_explorer_wrong_b.png';
import mascotIdleA from '../assets/gamification/mascot_idle_a.png';
import mascotIdleB from '../assets/gamification/mascot_idle_b.png';
import mascotLevelUpA from '../assets/gamification/mascot_level_up_a.png';
import mascotLevelUpB from '../assets/gamification/mascot_level_up_b.png';
import mascotRobotCorrectA from '../assets/gamification/mascot_robot_correct_a.png';
import mascotRobotCorrectB from '../assets/gamification/mascot_robot_correct_b.png';
import mascotRobotIdleA from '../assets/gamification/mascot_robot_idle_a.png';
import mascotRobotIdleB from '../assets/gamification/mascot_robot_idle_b.png';
import mascotRobotLevelUpA from '../assets/gamification/mascot_robot_level_up_a.png';
import mascotRobotLevelUpB from '../assets/gamification/mascot_robot_level_up_b.png';
import mascotRobotWrongA from '../assets/gamification/mascot_robot_wrong_a.png';
import mascotRobotWrongB from '../assets/gamification/mascot_robot_wrong_b.png';
import mascotWrongA from '../assets/gamification/mascot_wrong_a.png';
import mascotWrongB from '../assets/gamification/mascot_wrong_b.png';

export type MascotReactionState = 'idle' | 'correct' | 'wrong' | 'levelUp';
export type MascotPersona = 'coach' | 'explorer' | 'robot';

export interface MascotFrame {
  key: string;
  src: string;
}

export interface MascotPersonaManifest {
  label: string;
  framesByState: Record<MascotReactionState, MascotFrame[]>;
}

export const mascotStateLabels: Record<MascotReactionState, string> = {
  idle: 'ready to help',
  correct: 'celebrating a correct answer',
  wrong: 'encouraging another try',
  levelUp: 'celebrating progress',
};

export const mascotPersonaOrder: MascotPersona[] = ['coach', 'explorer', 'robot'];

export const mascotPersonas: Record<MascotPersona, MascotPersonaManifest> = {
  coach: {
    label: 'Language coach',
    framesByState: {
      idle: [
        { key: 'mascot_idle_a', src: mascotIdleA },
        { key: 'mascot_idle_b', src: mascotIdleB },
      ],
      correct: [
        { key: 'mascot_correct_a', src: mascotCorrectA },
        { key: 'mascot_correct_b', src: mascotCorrectB },
      ],
      wrong: [
        { key: 'mascot_wrong_a', src: mascotWrongA },
        { key: 'mascot_wrong_b', src: mascotWrongB },
      ],
      levelUp: [
        { key: 'mascot_level_up_a', src: mascotLevelUpA },
        { key: 'mascot_level_up_b', src: mascotLevelUpB },
      ],
    },
  },
  explorer: {
    label: 'Language explorer',
    framesByState: {
      idle: [
        { key: 'mascot_explorer_idle_a', src: mascotExplorerIdleA },
        { key: 'mascot_explorer_idle_b', src: mascotExplorerIdleB },
      ],
      correct: [
        { key: 'mascot_explorer_correct_a', src: mascotExplorerCorrectA },
        { key: 'mascot_explorer_correct_b', src: mascotExplorerCorrectB },
      ],
      wrong: [
        { key: 'mascot_explorer_wrong_a', src: mascotExplorerWrongA },
        { key: 'mascot_explorer_wrong_b', src: mascotExplorerWrongB },
      ],
      levelUp: [
        { key: 'mascot_explorer_level_up_a', src: mascotExplorerLevelUpA },
        { key: 'mascot_explorer_level_up_b', src: mascotExplorerLevelUpB },
      ],
    },
  },
  robot: {
    label: 'Robot tutor',
    framesByState: {
      idle: [
        { key: 'mascot_robot_idle_a', src: mascotRobotIdleA },
        { key: 'mascot_robot_idle_b', src: mascotRobotIdleB },
      ],
      correct: [
        { key: 'mascot_robot_correct_a', src: mascotRobotCorrectA },
        { key: 'mascot_robot_correct_b', src: mascotRobotCorrectB },
      ],
      wrong: [
        { key: 'mascot_robot_wrong_a', src: mascotRobotWrongA },
        { key: 'mascot_robot_wrong_b', src: mascotRobotWrongB },
      ],
      levelUp: [
        { key: 'mascot_robot_level_up_a', src: mascotRobotLevelUpA },
        { key: 'mascot_robot_level_up_b', src: mascotRobotLevelUpB },
      ],
    },
  },
};

export function resolveMascotPersona(eventKey: number, state: MascotReactionState): MascotPersona {
  if (state === 'idle') return 'coach';
  const index = Math.abs(eventKey || 0) % mascotPersonaOrder.length;
  return mascotPersonaOrder[index];
}
