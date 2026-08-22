import { UnlockedAbilities, AbilityId } from '../game/abilities';

export const ROUND_TARGETS = [31, 61, 91, 121] as const;
export type RoundTarget = (typeof ROUND_TARGETS)[number];

export interface RunState {
  currentRoundIndex: number; // 0-3
  abilities: UnlockedAbilities;
  roundResults: RoundResult[];
  runComplete: boolean;
  runWon: boolean;
}

export interface RoundResult {
  roundIndex: number;
  targetScore: RoundTarget;
  playerWon: boolean;
  playerFinalScore: number;
  aiFinalScore: number;
}

export function createInitialRunState(): RunState {
  return {
    currentRoundIndex: 0,
    abilities: {},
    roundResults: [],
    runComplete: false,
    runWon: false,
  };
}

export function currentTarget(run: RunState): RoundTarget {
  return ROUND_TARGETS[run.currentRoundIndex];
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

  if (nextRoundIndex >= ROUND_TARGETS.length) {
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
