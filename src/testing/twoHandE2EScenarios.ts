import { UnlockedAbilities } from '../game/abilities';
import { createBoardState, type BoardId } from '../game/boards';
import { type Card, type Rank, type Suit } from '../game/cards';
import {
  type TwoHandGameState,
  createInitialTwoHandGameState,
  dealTwoHands,
} from '../game/twoHandState';

export type TwoHandE2EScenario = 'single_go' | 'double_go';

export function createTwoHandGameStateForE2E(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
  scenario: TwoHandE2EScenario | null,
): TwoHandGameState {
  if (scenario === 'single_go')
    return buildSingleGoState(abilities, targetScore, boardId, handsLimit);
  if (scenario === 'double_go')
    return buildDoubleGoState(abilities, targetScore, boardId, handsLimit);

  return dealTwoHands(createInitialTwoHandGameState(abilities, targetScore, boardId, handsLimit));
}

export function getTwoHandE2EScenarioFromLocation(): TwoHandE2EScenario | null {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  if (!search) return null;
  const scenario = new URLSearchParams(search).get('twoHandE2EScenario');
  return scenario === 'single_go' || scenario === 'double_go' ? scenario : null;
}

export function shouldDisableTwoHandBoardModalForE2E(): boolean {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  if (!search) return false;
  return new URLSearchParams(search).get('twoHandE2EDisableBoardModal') === '1';
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
  const topCards = [card('K', 'clubs'), card('8', 'hearts')];
  const bottomCards = [card('Q', 'diamonds'), card('2', 'spades'), card('K', 'hearts')];

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
