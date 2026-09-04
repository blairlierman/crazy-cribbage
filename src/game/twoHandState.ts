import { UnlockedAbilities, abilityStacks, hasAbility } from './abilities';
import { applyBoardScore, BoardState, createBoardState } from './boards';
import { Card, cardValue, createDeck, shuffle } from './cards';
import { scoreHand, scorePegging } from './scoring';

export type TwoHandSeat = 'top' | 'bottom';
export type TwoHandPhase =
  'deal' | 'peek_starter' | 'discard' | 'swap' | 'pegging' | 'show' | 'round_over';

export interface TwoHandPlayerState {
  hand: Card[];
  discards: Card[];
  score: number;
}

export interface TwoHandPlayedCard {
  card: Card;
  playedBy: TwoHandSeat;
}

export interface TwoHandPeggingState {
  pile: Card[];
  playedCards: TwoHandPlayedCard[];
  count: number;
  topPassed: boolean;
  bottomPassed: boolean;
  topCards: Card[];
  bottomCards: Card[];
  lastToPlay: TwoHandSeat | null;
  pileResetCount: number;
}

export interface TwoHandHandResult {
  topPegging: number;
  bottomPegging: number;
  topHand: number;
  bottomHand: number;
  crib: number;
  cribOwner: TwoHandSeat;
  topTotal: number;
  bottomTotal: number;
  combinedTotal: number;
  topHandBreakdown: string[];
  bottomHandBreakdown: string[];
  cribBreakdown: string[];
  boardBefore: BoardState;
  boardAfter: BoardState;
  boardLog: string[];
}

export interface TwoHandGameState {
  deck: Card[];
  top: TwoHandPlayerState;
  bottom: TwoHandPlayerState;
  crib: Card[];
  starter: Card | null;
  phase: TwoHandPhase;
  dealer: TwoHandSeat;
  discardSeat: TwoHandSeat;
  swapSeat: TwoHandSeat | null;
  pegging: TwoHandPeggingState;
  handResult: TwoHandHandResult | null;
  abilities: UnlockedAbilities;
  swapsLeft: Record<TwoHandSeat, number>;
  luckyRerollAvailable: boolean;
  targetScore: number;
  board: BoardState;
  winner: boolean | null;
  handNumber: number;
  handsLimit: number;
  handStartScores: Record<TwoHandSeat, number>;
  peggingLog: string[];
}

export function createInitialTwoHandGameState(
  abilities: UnlockedAbilities,
  targetScore: number,
  boardId: BoardState['boardId'],
  handsLimit: number,
): TwoHandGameState {
  return {
    deck: [],
    top: { hand: [], discards: [], score: 0 },
    bottom: { hand: [], discards: [], score: 0 },
    crib: [],
    starter: null,
    phase: 'deal',
    dealer: 'top',
    discardSeat: 'top',
    swapSeat: null,
    pegging: createPeggingState('top'),
    handResult: null,
    abilities,
    swapsLeft: { top: 0, bottom: 0 },
    luckyRerollAvailable: false,
    targetScore,
    board: createBoardState(boardId),
    winner: null,
    handNumber: 0,
    handsLimit,
    handStartScores: { top: 0, bottom: 0 },
    peggingLog: [],
  };
}

function createPeggingState(dealer: TwoHandSeat): TwoHandPeggingState {
  return {
    pile: [],
    playedCards: [],
    count: 0,
    topPassed: false,
    bottomPassed: false,
    topCards: [],
    bottomCards: [],
    lastToPlay: dealer,
    pileResetCount: 0,
  };
}

export function dealTwoHands(state: TwoHandGameState): TwoHandGameState {
  const deck = shuffle(createDeck());
  const extraCard = hasAbility(state.abilities, 'extra_discard') ? 1 : 0;
  const handSize = 6 + extraCard;
  const topHand = deck.slice(0, handSize);
  const bottomHand = deck.slice(handSize, handSize * 2);
  const remaining = deck.slice(handSize * 2);
  const phase: TwoHandPhase = hasAbility(state.abilities, 'peek_starter')
    ? 'peek_starter'
    : 'discard';
  const starter = phase === 'peek_starter' ? remaining[0] : null;

  return {
    ...state,
    deck: remaining,
    top: { ...state.top, hand: topHand, discards: [] },
    bottom: { ...state.bottom, hand: bottomHand, discards: [] },
    crib: [],
    starter,
    phase,
    discardSeat: 'top',
    swapSeat: null,
    pegging: createPeggingState(state.dealer),
    handResult: null,
    swapsLeft: {
      top: abilityStacks(state.abilities, 'swap_one'),
      bottom: abilityStacks(state.abilities, 'swap_one'),
    },
    luckyRerollAvailable: hasAbility(state.abilities, 'lucky_cut'),
    handNumber: state.handNumber + 1,
    handStartScores: {
      top: state.top.score,
      bottom: state.bottom.score,
    },
    peggingLog: [],
  };
}

export function getDiscardCount(state: TwoHandGameState): number {
  return hasAbility(state.abilities, 'extra_discard') ? 3 : 2;
}

export function discardForSeat(
  state: TwoHandGameState,
  seat: TwoHandSeat,
  cards: Card[],
): TwoHandGameState {
  const discardCount = getDiscardCount(state);
  if (cards.length !== discardCount) return state;
  const side = state[seat];
  const newHand = side.hand.filter((c) => !cards.some((d) => d.id === c.id));
  const updated: TwoHandGameState = {
    ...state,
    [seat]: { ...side, hand: newHand, discards: cards },
    crib: [...state.crib, ...cards],
  };

  if (seat === 'top') {
    return { ...updated, discardSeat: 'bottom' };
  }

  return proceedAfterDiscard(updated);
}

function proceedAfterDiscard(state: TwoHandGameState): TwoHandGameState {
  if (state.swapsLeft.top > 0 || state.swapsLeft.bottom > 0) {
    return {
      ...state,
      phase: 'swap',
      swapSeat: state.swapsLeft.top > 0 ? 'top' : 'bottom',
    };
  }
  return proceedToPegging(state);
}

export function swapForSeat(
  state: TwoHandGameState,
  seat: TwoHandSeat,
  cardToSwap: Card | null,
): TwoHandGameState {
  if (state.swapSeat !== seat) return state;

  let updated = state;
  if (cardToSwap && state.swapsLeft[seat] > 0) {
    const [newCard, ...remainingDeck] = state.deck;
    const newHand = state[seat].hand.map((c) => (c.id === cardToSwap.id ? newCard : c));
    updated = {
      ...state,
      [seat]: { ...state[seat], hand: newHand },
      deck: [...remainingDeck, cardToSwap],
      swapsLeft: { ...state.swapsLeft, [seat]: state.swapsLeft[seat] - 1 },
    };
  }

  const nextSeat: TwoHandSeat | null =
    seat === 'top' && updated.swapsLeft.bottom > 0 ? 'bottom' : null;

  if (nextSeat) {
    return { ...updated, swapSeat: nextSeat };
  }

  return proceedToPegging({ ...updated, swapSeat: null });
}

export function rerollTwoHandStarter(state: TwoHandGameState): TwoHandGameState {
  if (!state.luckyRerollAvailable || state.deck.length === 0 || !state.starter) return state;
  const [newStarter, ...rest] = state.deck;
  return {
    ...state,
    starter: newStarter,
    deck: [...rest, state.starter],
    luckyRerollAvailable: false,
  };
}

function proceedToPegging(state: TwoHandGameState): TwoHandGameState {
  const starter = state.starter ?? state.deck[0];
  const deck = state.starter ? state.deck : state.deck.slice(1);
  let topScore = state.top.score;
  let bottomScore = state.bottom.score;
  const log: string[] = [];

  if (starter.rank === 'J') {
    if (state.dealer === 'top') {
      topScore += 2;
      log.push('His heels! Top hand gets 2 pts');
    } else {
      bottomScore += 2;
      log.push('His heels! Bottom hand gets 2 pts');
    }
  }

  return {
    ...state,
    deck,
    starter,
    phase: 'pegging',
    top: { ...state.top, score: topScore },
    bottom: { ...state.bottom, score: bottomScore },
    pegging: {
      ...createPeggingState(state.dealer),
      topCards: [...state.top.hand],
      bottomCards: [...state.bottom.hand],
    },
    peggingLog: log,
  };
}

export function getActivePeggingSeat(state: TwoHandGameState): TwoHandSeat {
  return state.pegging.lastToPlay === 'top' ? 'bottom' : 'top';
}

export function canSeatPlay(state: TwoHandGameState, seat: TwoHandSeat): boolean {
  const cards = seat === 'top' ? state.pegging.topCards : state.pegging.bottomCards;
  return cards.some((c) => cardValue(c) + state.pegging.count <= 31);
}

export function playPeggingCard(
  state: TwoHandGameState,
  seat: TwoHandSeat,
  card: Card,
): TwoHandGameState {
  const pegging = state.pegging;
  const cards = seat === 'top' ? pegging.topCards : pegging.bottomCards;
  if (!cards.some((c) => c.id === card.id)) return state;
  if (cardValue(card) + pegging.count > 31) return state;

  const newPile = [...pegging.pile, card];
  const newCount = pegging.count + cardValue(card);
  const remainingCards = cards.filter((c) => c.id !== card.id);
  const score = scorePegging(newPile, card);
  const log = [...state.peggingLog];
  if (score.details.length > 0) {
    log.push(`${seat === 'top' ? 'Top' : 'Bottom'}: ${score.details.join(', ')}`);
  }

  let topScore = state.top.score;
  let bottomScore = state.bottom.score;
  if (seat === 'top') topScore += score.total;
  else bottomScore += score.total;

  let newPegging: TwoHandPeggingState = {
    ...pegging,
    pile: newPile,
    playedCards: [...pegging.playedCards, { card, playedBy: seat }],
    count: newCount,
    topCards: seat === 'top' ? remainingCards : pegging.topCards,
    bottomCards: seat === 'bottom' ? remainingCards : pegging.bottomCards,
    topPassed: seat === 'top' ? false : pegging.topPassed,
    bottomPassed: seat === 'bottom' ? false : pegging.bottomPassed,
    lastToPlay: seat,
  };

  if (newCount === 31) {
    log.push(`${seat === 'top' ? 'Top' : 'Bottom'} plays to 31!`);
    newPegging = {
      ...newPegging,
      pile: [],
      count: 0,
      topPassed: false,
      bottomPassed: false,
      lastToPlay: seat,
      pileResetCount: newPegging.pileResetCount + 1,
    };
  }

  return {
    ...state,
    top: { ...state.top, score: topScore },
    bottom: { ...state.bottom, score: bottomScore },
    pegging: newPegging,
    peggingLog: log,
  };
}

export function passPegging(state: TwoHandGameState, seat: TwoHandSeat): TwoHandGameState {
  if (seat === 'top') {
    return { ...state, pegging: { ...state.pegging, topPassed: true } };
  }
  return { ...state, pegging: { ...state.pegging, bottomPassed: true } };
}

export function awardGoTwoHands(state: TwoHandGameState, seat: TwoHandSeat): TwoHandGameState {
  const pts = 1 + (hasAbility(state.abilities, 'go_bonus') ? 1 : 0);
  const log = [...state.peggingLog, `${seat === 'top' ? 'Top' : 'Bottom'} gets go (+${pts})`];
  if (seat === 'top') {
    return { ...state, top: { ...state.top, score: state.top.score + pts }, peggingLog: log };
  }
  return {
    ...state,
    bottom: { ...state.bottom, score: state.bottom.score + pts },
    peggingLog: log,
  };
}

export function resetTwoHandPegging(
  state: TwoHandGameState,
  goRecipient: TwoHandSeat,
): TwoHandGameState {
  return {
    ...state,
    pegging: {
      ...state.pegging,
      pile: [],
      count: 0,
      topPassed: false,
      bottomPassed: false,
      lastToPlay: goRecipient,
      pileResetCount: state.pegging.pileResetCount + 1,
    },
  };
}

export function isTwoHandPeggingComplete(state: TwoHandGameState): boolean {
  return state.pegging.topCards.length === 0 && state.pegging.bottomCards.length === 0;
}

export function scoreTwoHandShow(state: TwoHandGameState): TwoHandGameState {
  if (!state.starter) return state;

  const doubleFifteens = hasAbility(state.abilities, 'double_fifteens');
  const runBonus = abilityStacks(state.abilities, 'run_bonus');

  const applyBonuses = (base: ReturnType<typeof scoreHand>) => {
    let total = base.total;
    if (doubleFifteens) {
      const fifteenPts = base.breakdown
        .filter((b) => b.description.includes('fifteen'))
        .reduce((sum, item) => sum + item.points, 0);
      total += fifteenPts;
    }
    if (runBonus > 0) {
      for (const line of base.breakdown) {
        if (!line.description.includes('Run')) continue;
        const match = line.description.match(/of (\d+)/);
        if (match) total += parseInt(match[1], 10) * runBonus;
      }
    }
    return total;
  };

  const nonDealer: TwoHandSeat = state.dealer === 'top' ? 'bottom' : 'top';
  const dealer = state.dealer;
  const boardBefore = state.board;
  let topScore = state.top.score;
  let bottomScore = state.bottom.score;
  let topHand = 0;
  let bottomHand = 0;
  let crib = 0;
  let topHandBreakdown: string[] = [];
  let bottomHandBreakdown: string[] = [];
  let cribBreakdown: string[] = [];

  const scoreSeatHand = (seat: TwoHandSeat) => {
    const base = scoreHand(state[seat].hand, state.starter!, false);
    const pts = applyBonuses(base);
    const breakdown = base.breakdown.map((item) => item.description);
    if (seat === 'top') {
      topHand = pts;
      topHandBreakdown = breakdown;
      topScore += pts;
    } else {
      bottomHand = pts;
      bottomHandBreakdown = breakdown;
      bottomScore += pts;
    }
  };

  scoreSeatHand(nonDealer);
  scoreSeatHand(dealer);

  const baseCrib = scoreHand(state.crib.slice(0, 4), state.starter, true);
  crib = applyBonuses(baseCrib);
  cribBreakdown = baseCrib.breakdown.map((item) => item.description);
  if (dealer === 'top') topScore += crib;
  else bottomScore += crib;

  const topTotal = topScore - state.handStartScores.top;
  const bottomTotal = bottomScore - state.handStartScores.bottom;
  const topBoardMove = applyBoardScore(boardBefore, 'topPeg', topTotal);
  const bottomBoardMove = applyBoardScore(topBoardMove.board, 'bottomPeg', bottomTotal);
  const boardLog = [...topBoardMove.effects, ...bottomBoardMove.effects];
  const boardAfter = { ...bottomBoardMove.board, lastEffects: boardLog };
  const playerWon = boardAfter.totalProgress >= state.targetScore;
  const outOfHands = state.handNumber >= state.handsLimit;

  return {
    ...state,
    top: { ...state.top, score: topScore },
    bottom: { ...state.bottom, score: bottomScore },
    board: boardAfter,
    handResult: {
      topPegging: 0,
      bottomPegging: 0,
      topHand,
      bottomHand,
      crib,
      cribOwner: dealer,
      topTotal,
      bottomTotal,
      combinedTotal: topTotal + bottomTotal,
      topHandBreakdown,
      bottomHandBreakdown,
      cribBreakdown,
      boardBefore,
      boardAfter,
      boardLog,
    },
    phase: playerWon || outOfHands ? 'round_over' : 'show',
    winner: playerWon ? true : outOfHands ? false : null,
    dealer: state.dealer === 'top' ? 'bottom' : 'top',
  };
}
