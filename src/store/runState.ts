import { UnlockedAbilities, AbilityId } from '../game/abilities';
import { BoardId } from '../game/boards';
import { GameMode, RoundConfig, getModeConfig } from '../game/modes';

export interface RunState {
  mode: GameMode;
  currentRoundIndex: number; // 0-3
  abilities: UnlockedAbilities;
  roundResults: RoundResult[];
  runComplete: boolean;
  runWon: boolean;
}

export interface RoundResult {
  mode: GameMode;
  roundIndex: number;
  targetScore: number;
  playerWon: boolean;
  playerFinalScore: number;
  opponentFinalScore: number;
  boardId: BoardId | null;
  handsUsed: number | null;
  handsLimit: number | null;
  boardProgress: number | null;
}

export function createInitialRunState(mode: GameMode = 'classic'): RunState {
  return {
    mode,
    currentRoundIndex: 0,
    abilities: {},
    roundResults: [],
    runComplete: false,
    runWon: false,
  };
}

export function currentRound(run: RunState): RoundConfig {
  const rounds = getModeConfig(run.mode).rounds;
  return rounds[Math.min(run.currentRoundIndex, rounds.length - 1)];
}

export function advanceRound(
  run: RunState,
  result: RoundResult,
  chosenAbility: AbilityId | null,
): RunState {
  const roundResults = [...run.roundResults, result];

  if (!result.playerWon) {
    // Player lost the round = run over
    return {
      ...run,
      roundResults,
      runComplete: true,
      runWon: false,
    };
  }

  // Apply chosen ability
  const abilities = { ...run.abilities };
  if (chosenAbility) {
    abilities[chosenAbility] = (abilities[chosenAbility] ?? 0) + 1;
  }

  const nextRoundIndex = run.currentRoundIndex + 1;
  const rounds = getModeConfig(run.mode).rounds;

  if (nextRoundIndex >= rounds.length) {
    // Player won all rounds
    return {
      ...run,
      roundResults,
      abilities,
      currentRoundIndex: nextRoundIndex,
      runComplete: true,
      runWon: true,
    };
  }

  return {
    ...run,
    roundResults,
    abilities,
    currentRoundIndex: nextRoundIndex,
    runComplete: false,
    runWon: false,
  };
}
