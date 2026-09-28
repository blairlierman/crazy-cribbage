import { UnlockedAbilities } from '../game/abilities';
import { createBoardState, type BoardId } from '../game/boards';
import { type Card, type Rank, type Suit } from '../game/cards';
import {
  type TwoHandGameState,
  createInitialTwoHandGameState,
  dealTwoHands,
} from '../game/twoHandState';

declare global {
  // eslint-disable-next-line no-var
  var __CRAZY_CRIBBAGE_E2E_TWO_HAND_SCENARIO__: 'single_go' | 'double_go' | undefined;
}

export function createTwoHandGameStateForE2E(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const scenario = globalThis.__CRAZY_CRIBBAGE_E2E_TWO_HAND_SCENARIO__;
  globalThis.__CRAZY_CRIBBAGE_E2E_TWO_HAND_SCENARIO__ = undefined;

  if (scenario === 'single_go') return buildSingleGoState(abilities, targetScore, boardId, handsLimit);
  if (scenario === 'double_go') return buildDoubleGoState(abilities, targetScore, boardId, handsLimit);

  return dealTwoHands(createInitialTwoHandGameState(abilities, targetScore, boardId, handsLimit));
}

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

function createBasePeggingState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const base = createInitialTwoHandGameState(abilities, targetScore, boardId, handsLimit);
  return {
    ...base,
    phase: 'pegging',
    handNumber: 1,
    starter: card('5', 'hearts'),
    board: createBoardState(boardId),
  };
}

function buildSingleGoState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const topCards = [card('K', 'clubs')];
  const bottomCards = [card('Q', 'diamonds')];

  return {
    ...createBasePeggingState(abilities, targetScore, boardId, handsLimit),
    top: { hand: [...topCards], discards: [], score: 0 },
    bottom: { hand: [...bottomCards], discards: [], score: 0 },
    pegging: {
      pile: [card('10', 'clubs'), card('10', 'spades'), card('10', 'hearts')],
      playedCards: [
        { card: card('10', 'clubs'), playedBy: 'top' },
        { card: card('10', 'spades'), playedBy: 'bottom' },
        { card: card('10', 'hearts'), playedBy: 'bottom' },
      ],
      count: 30,
      topPassed: false,
      bottomPassed: false,
      topCards,
      bottomCards,
      lastToPlay: 'bottom',
      pileResetCount: 0,
    },
  };
}

function buildDoubleGoState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const topCards = [card('K', 'clubs'), card('9', 'hearts')];
  const bottomCards = [card('Q', 'diamonds'), card('A', 'spades'), card('K', 'hearts')];

  return {
    ...createBasePeggingState(abilities, targetScore, boardId, handsLimit),
    top: { hand: [...topCards], discards: [], score: 0 },
    bottom: { hand: [...bottomCards], discards: [], score: 0 },
    pegging: {
      pile: [card('10', 'clubs'), card('10', 'spades'), card('10', 'hearts')],
      playedCards: [
        { card: card('10', 'clubs'), playedBy: 'top' },
        { card: card('10', 'spades'), playedBy: 'bottom' },
        { card: card('10', 'hearts'), playedBy: 'bottom' },
      ],
      count: 30,
      topPassed: false,
      bottomPassed: false,
      topCards,
      bottomCards,
      lastToPlay: 'bottom',
      pileResetCount: 0,
    },
  };
}
