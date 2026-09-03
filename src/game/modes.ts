import { BoardId } from './boards';

export type GameMode = 'classic' | 'two_hands';

export interface RoundConfig {
  targetScore: number;
  boardId: BoardId | null;
  handsLimit: number | null;
  rewardChoices: number;
}

export interface ModeConfig {
  id: GameMode;
  name: string;
  description: string;
  rounds: RoundConfig[];
}

export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Beat the AI through escalating roguelike cribbage rounds.',
    rounds: [
      { targetScore: 31, boardId: null, handsLimit: null, rewardChoices: 3 },
      { targetScore: 61, boardId: null, handsLimit: null, rewardChoices: 3 },
      { targetScore: 91, boardId: null, handsLimit: null, rewardChoices: 3 },
      { targetScore: 121, boardId: null, handsLimit: null, rewardChoices: 3 },
    ],
  },
  two_hands: {
    id: 'two_hands',
    name: 'Twin Hands',
    description:
      'Play both hands, race across themed boards, and clear each round before hands run out.',
    rounds: [
      { targetScore: 45, boardId: 'tavern_table', handsLimit: 2, rewardChoices: 3 },
      { targetScore: 95, boardId: 'moonlit_maze', handsLimit: 3, rewardChoices: 3 },
      { targetScore: 150, boardId: 'pirate_map', handsLimit: 4, rewardChoices: 3 },
      { targetScore: 210, boardId: 'clockwork_workshop', handsLimit: 5, rewardChoices: 3 },
    ],
  },
};

export function getModeConfig(mode: GameMode): ModeConfig {
  return MODE_CONFIGS[mode];
}
