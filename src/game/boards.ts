export type BoardId = 'tavern_table' | 'moonlit_maze' | 'pirate_map' | 'clockwork_workshop';

export type BoardSpaceType =
  'boost' | 'setback' | 'shortcut' | 'safe' | 'mud' | 'momentum' | 'checkpoint';

export interface BoardSpace {
  position: number;
  type: BoardSpaceType;
  value: number;
  label: string;
  description: string;
}

export interface BoardDefinition {
  id: BoardId;
  name: string;
  theme: string;
  description: string;
  trackLength: number;
  spaces: BoardSpace[];
}

export interface PegState {
  position: number;
  safeCharges: number;
  nextMoveBonus: number;
  nextMovePenalty: number;
  checkpoint: number;
}

export interface BoardState {
  boardId: BoardId;
  topPeg: PegState;
  bottomPeg: PegState;
  totalProgress: number;
  lastEffects: string[];
}

export interface BoardMoveResult {
  board: BoardState;
  effects: string[];
}

export const BOARD_DEFINITIONS: Record<BoardId, BoardDefinition> = {
  tavern_table: {
    id: 'tavern_table',
    name: 'Tavern Table',
    theme: 'Spilled drinks, coins, and knives on a battered card table.',
    description: 'Friendly early boosts with a few greasy setbacks.',
    trackLength: 28,
    spaces: [
      {
        position: 4,
        type: 'boost',
        value: 3,
        label: 'Coins',
        description: 'Loose winnings push you ahead.',
      },
      {
        position: 9,
        type: 'safe',
        value: 1,
        label: 'Coaster',
        description: 'Shield the next setback.',
      },
      {
        position: 12,
        type: 'setback',
        value: 3,
        label: 'Spill',
        description: 'A drink spill sends you backward.',
      },
      {
        position: 17,
        type: 'shortcut',
        value: 4,
        label: 'Stack',
        description: 'Hop across a stack of chips.',
      },
      {
        position: 22,
        type: 'mud',
        value: 2,
        label: 'Sticky Ale',
        description: 'Next move is slowed.',
      },
      {
        position: 25,
        type: 'checkpoint',
        value: 0,
        label: 'Lantern',
        description: 'Lock in your progress.',
      },
    ],
  },
  moonlit_maze: {
    id: 'moonlit_maze',
    name: 'Moonlit Maze',
    theme: 'Silver hedges, hidden gates, and winding dead ends.',
    description: 'More defensive spaces with a punishing central setback.',
    trackLength: 32,
    spaces: [
      {
        position: 5,
        type: 'momentum',
        value: 2,
        label: 'Fireflies',
        description: 'Next move gains extra speed.',
      },
      {
        position: 8,
        type: 'checkpoint',
        value: 0,
        label: 'Archway',
        description: 'A safe checkpoint.',
      },
      {
        position: 14,
        type: 'setback',
        value: 5,
        label: 'Dead End',
        description: 'You backtrack through the maze.',
      },
      {
        position: 18,
        type: 'safe',
        value: 1,
        label: 'Moon Pool',
        description: 'Ignore one future setback.',
      },
      {
        position: 24,
        type: 'shortcut',
        value: 5,
        label: 'Hidden Gate',
        description: 'A secret gate cuts the path.',
      },
      {
        position: 28,
        type: 'mud',
        value: 1,
        label: 'Thorns',
        description: 'Next move loses 1 space.',
      },
    ],
  },
  pirate_map: {
    id: 'pirate_map',
    name: 'Pirate Map',
    theme: 'Currents, coves, and cannon-blasted shortcuts.',
    description: 'Swingy routes with both treasure boosts and harsh currents.',
    trackLength: 36,
    spaces: [
      {
        position: 3,
        type: 'boost',
        value: 2,
        label: 'Tailwind',
        description: 'A tailwind speeds you along.',
      },
      {
        position: 10,
        type: 'setback',
        value: 4,
        label: 'Current',
        description: 'A current drags you backward.',
      },
      {
        position: 13,
        type: 'shortcut',
        value: 6,
        label: 'Cannon Jump',
        description: 'Blast to a hidden cove.',
      },
      {
        position: 19,
        type: 'safe',
        value: 1,
        label: 'Anchor',
        description: 'Brace against the next setback.',
      },
      {
        position: 23,
        type: 'momentum',
        value: 3,
        label: 'Trade Wind',
        description: 'Next move gets a major boost.',
      },
      {
        position: 31,
        type: 'setback',
        value: 6,
        label: 'Kraken Wake',
        description: 'A rough sea throws you back.',
      },
    ],
  },
  clockwork_workshop: {
    id: 'clockwork_workshop',
    name: 'Clockwork Workshop',
    theme: 'Gears, springs, and whirring brass conveyors.',
    description: 'Long board with compounding movement effects.',
    trackLength: 40,
    spaces: [
      {
        position: 6,
        type: 'momentum',
        value: 2,
        label: 'Gear Train',
        description: 'Your next move gets extra lift.',
      },
      {
        position: 11,
        type: 'mud',
        value: 2,
        label: 'Snagged Spring',
        description: 'Next move is reduced.',
      },
      {
        position: 16,
        type: 'checkpoint',
        value: 0,
        label: 'Workbench',
        description: 'Progress is locked here.',
      },
      {
        position: 21,
        type: 'boost',
        value: 4,
        label: 'Conveyor',
        description: 'A conveyor pushes you ahead.',
      },
      {
        position: 27,
        type: 'setback',
        value: 5,
        label: 'Reverse Gear',
        description: 'The machine rewinds your peg.',
      },
      {
        position: 33,
        type: 'shortcut',
        value: 7,
        label: 'Lift',
        description: 'A brass lift skips several spaces.',
      },
    ],
  },
};

export function getBoardDefinition(boardId: BoardId): BoardDefinition {
  return BOARD_DEFINITIONS[boardId];
}

export function createBoardState(boardId: BoardId): BoardState {
  return {
    boardId,
    topPeg: createPegState(),
    bottomPeg: createPegState(),
    totalProgress: 0,
    lastEffects: [],
  };
}

function createPegState(): PegState {
  return {
    position: 0,
    safeCharges: 0,
    nextMoveBonus: 0,
    nextMovePenalty: 0,
    checkpoint: 0,
  };
}

export function applyBoardScore(
  board: BoardState,
  pegKey: 'topPeg' | 'bottomPeg',
  rawPoints: number,
): BoardMoveResult {
  const definition = getBoardDefinition(board.boardId);
  const peg = board[pegKey];
  const effects: string[] = [];

  const move = Math.max(0, rawPoints + peg.nextMoveBonus - peg.nextMovePenalty);
  let nextPeg: PegState = {
    ...peg,
    position: Math.min(definition.trackLength, peg.position + move),
    nextMoveBonus: 0,
    nextMovePenalty: 0,
  };

  if (peg.nextMoveBonus > 0) {
    effects.push(
      `${pegKey === 'topPeg' ? 'Top' : 'Bottom'} hand carries momentum (+${peg.nextMoveBonus}).`,
    );
  }
  if (peg.nextMovePenalty > 0) {
    effects.push(
      `${pegKey === 'topPeg' ? 'Top' : 'Bottom'} hand pushes through mud (-${peg.nextMovePenalty}).`,
    );
  }

  const visited = new Set<number>();
  while (!visited.has(nextPeg.position)) {
    visited.add(nextPeg.position);
    const space = definition.spaces.find((item) => item.position === nextPeg.position);
    if (!space) break;

    switch (space.type) {
      case 'boost':
      case 'shortcut':
        nextPeg = {
          ...nextPeg,
          position: Math.min(definition.trackLength, nextPeg.position + space.value),
        };
        effects.push(`${space.label}: ${space.description}`);
        continue;
      case 'setback':
        if (nextPeg.safeCharges > 0) {
          nextPeg = { ...nextPeg, safeCharges: nextPeg.safeCharges - 1 };
          effects.push(`${space.label}: shielded by a safe space.`);
          break;
        }
        nextPeg = {
          ...nextPeg,
          position: Math.max(nextPeg.checkpoint, nextPeg.position - space.value),
        };
        effects.push(`${space.label}: ${space.description}`);
        continue;
      case 'safe':
        nextPeg = { ...nextPeg, safeCharges: nextPeg.safeCharges + 1 };
        effects.push(`${space.label}: ${space.description}`);
        break;
      case 'mud':
        nextPeg = { ...nextPeg, nextMovePenalty: nextPeg.nextMovePenalty + space.value };
        effects.push(`${space.label}: ${space.description}`);
        break;
      case 'momentum':
        nextPeg = { ...nextPeg, nextMoveBonus: nextPeg.nextMoveBonus + space.value };
        effects.push(`${space.label}: ${space.description}`);
        break;
      case 'checkpoint':
        nextPeg = { ...nextPeg, checkpoint: Math.max(nextPeg.checkpoint, nextPeg.position) };
        effects.push(`${space.label}: ${space.description}`);
        break;
    }
    break;
  }

  const updated: BoardState = {
    ...board,
    [pegKey]: nextPeg,
    totalProgress:
      (pegKey === 'topPeg' ? nextPeg.position : board.topPeg.position) +
      (pegKey === 'bottomPeg' ? nextPeg.position : board.bottomPeg.position),
    lastEffects: effects,
  };

  return { board: updated, effects };
}
