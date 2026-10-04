import { UnlockedAbilities } from '../game/abilities';
import { createBoardState, type BoardId } from '../game/boards';
import { createDeck, type Card, type Rank, type Suit } from '../game/cards';
import {
  type TwoHandGameState,
  createInitialTwoHandGameState,
  dealTwoHands,
} from '../game/twoHandState';

export type TwoHandE2EScenario =
  | 'single_go'
  | 'double_go'
  | 'discard_flow'
  | 'pegging_score'
  | 'show_progression'
  | 'winning_go'
  | 'loss_at_limit';

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
  if (scenario === 'discard_flow')
    return buildDiscardFlowState(abilities, targetScore, boardId, handsLimit);
  if (scenario === 'pegging_score')
    return buildPeggingScoreState(abilities, targetScore, boardId, handsLimit);
  if (scenario === 'show_progression')
    return buildShowState(abilities, targetScore, boardId, handsLimit, 1);
  if (scenario === 'winning_go')
    return buildWinningGoState(abilities, targetScore, boardId, handsLimit);
  if (scenario === 'loss_at_limit')
    return buildShowState(abilities, targetScore, boardId, handsLimit, handsLimit);

  return dealTwoHands(createInitialTwoHandGameState(abilities, targetScore, boardId, handsLimit));
}

export function getTwoHandE2EScenarioFromLocation(): TwoHandE2EScenario | null {
  const search = (globalThis as { location?: { search?: string } }).location?.search;
  if (!search) return null;
  const scenario = new URLSearchParams(search).get('twoHandE2EScenario');
  return scenario === 'single_go' ||
    scenario === 'double_go' ||
    scenario === 'discard_flow' ||
    scenario === 'pegging_score' ||
    scenario === 'show_progression' ||
    scenario === 'winning_go' ||
    scenario === 'loss_at_limit'
    ? scenario
    : null;
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

function buildDiscardFlowState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const topCards = [
    card('K', 'clubs'),
    card('Q', 'clubs'),
    card('J', 'clubs'),
    card('9', 'clubs'),
    card('8', 'clubs'),
    card('7', 'clubs'),
  ];
  const bottomCards = [
    card('6', 'hearts'),
    card('5', 'hearts'),
    card('4', 'hearts'),
    card('3', 'hearts'),
    card('2', 'hearts'),
    card('A', 'hearts'),
  ];
  const dealtCardIds = new Set([...topCards, ...bottomCards].map((dealtCard) => dealtCard.id));

  return {
    ...createInitialTwoHandGameState(abilities, targetScore, boardId, handsLimit),
    deck: createDeck().filter((dealtCard) => !dealtCardIds.has(dealtCard.id)),
    top: { hand: topCards, discards: [], score: 0 },
    bottom: { hand: bottomCards, discards: [], score: 0 },
    phase: 'discard',
    handNumber: 1,
  };
}

function buildPeggingScoreState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const topCards = [card('10', 'clubs'), card('K', 'clubs')];
  const bottomCards = [card('5', 'clubs'), card('6', 'clubs'), card('2', 'clubs')];

  return {
    ...createBasePeggingState(abilities, targetScore, boardId, handsLimit),
    top: { hand: [...topCards], discards: [], score: 0 },
    bottom: { hand: [...bottomCards], discards: [], score: 0 },
    pegging: {
      pile: [card('5', 'spades')],
      playedCards: [{ card: card('5', 'spades'), playedBy: 'top' }],
      count: 10,
      topPassed: false,
      bottomPassed: false,
      topCards,
      bottomCards,
      lastToPlay: 'top',
      pileResetCount: 0,
    },
  };
}

function buildShowState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
  handNumber: number,
): TwoHandGameState {
  const topCards = [
    card('5', 'hearts'),
    card('6', 'hearts'),
    card('7', 'hearts'),
    card('8', 'hearts'),
  ];
  const bottomCards = [
    card('2', 'clubs'),
    card('3', 'clubs'),
    card('4', 'clubs'),
    card('K', 'hearts'),
  ];

  return {
    ...createBasePeggingState(abilities, targetScore, boardId, handsLimit),
    top: { hand: topCards, discards: [], score: 0 },
    bottom: { hand: bottomCards, discards: [], score: 0 },
    crib: [card('A', 'clubs'), card('A', 'diamonds'), card('2', 'diamonds'), card('3', 'spades')],
    handNumber,
    pegging: {
      pile: [],
      playedCards: [],
      count: 0,
      topPassed: false,
      bottomPassed: false,
      topCards: [],
      bottomCards: [],
      lastToPlay: 'bottom',
      pileResetCount: 0,
    },
  };
}

function buildWinningGoState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardId,
  handsLimit: number,
): TwoHandGameState {
  const state = buildSingleGoState(abilities, targetScore, boardId, handsLimit);
  const position = targetScore - 1;
  return {
    ...state,
    board: {
      ...state.board,
      peg: { ...state.board.peg, position },
      trailPosition: position,
      totalProgress: position,
    },
  };
}
