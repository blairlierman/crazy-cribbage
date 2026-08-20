import { Card, cardValue, createDeck, shuffle } from './cards';
import { scoreHand, scorePegging } from './scoring';
import { UnlockedAbilities, hasAbility, abilityStacks } from './abilities';

export type GamePhase =
  | 'deal'
  | 'discard'
  | 'peek_starter'   // ability: see starter before discard
  | 'swap'           // ability: swap a card
  | 'pegging'
  | 'show'
  | 'round_over';

export interface PlayerState {
  hand: Card[];
  discards: Card[];  // cards discarded to crib
  score: number;
}

export interface PeggingPlayedCard {
  card: Card;
  playedBy: 'player' | 'ai';
}

export interface PeggingState {
  pile: Card[];
  playedCards: PeggingPlayedCard[];  // all cards played this hand (for display after pile resets)
  count: number;   // sum of pile
  playerPassed: boolean;
  aiPassed: boolean;
  playerCards: Card[];  // cards still in hand during pegging
  aiCards: Card[];
  lastToPlay: 'player' | 'ai' | null;
  pileResetCount: number;  // incremented each time the pile is reset after a go/31
}

export interface HandResult {
  playerPegging: number;
  aiPegging: number;
  playerHand: number;
  aiHand: number;
  crib: number;
  cribOwner: 'player' | 'ai';
  playerTotal: number;
  aiTotal: number;
  playerHandBreakdown: string[];
  aiHandBreakdown: string[];
  cribBreakdown: string[];
}

export interface GameState {
  deck: Card[];
  player: PlayerState;
  ai: PlayerState;
  crib: Card[];
  starter: Card | null;
  phase: GamePhase;
  dealer: 'player' | 'ai';
  pegging: PeggingState;
  handResult: HandResult | null;
  abilities: UnlockedAbilities;
  swapsLeft: number;
  luckyRerollAvailable: boolean;
  targetScore: number;
  winner: 'player' | 'ai' | null;
  handNumber: number;
  peggingLog: string[];
}

export function createInitialGameState(
  abilities: UnlockedAbilities,
  targetScore: number,
  dealer: 'player' | 'ai' = 'player'
): GameState {
  return {
    deck: [],
    player: { hand: [], discards: [], score: 0 },
    ai: { hand: [], discards: [], score: 0 },
    crib: [],
    starter: null,
    phase: 'deal',
    dealer,
    pegging: {
      pile: [],
      playedCards: [],
      count: 0,
      playerPassed: false,
      aiPassed: false,
      playerCards: [],
      aiCards: [],
      lastToPlay: null,
      pileResetCount: 0,
    },
    swapsLeft: 0,
    luckyRerollAvailable: false,
    targetScore,
    winner: null,
    handNumber: 0,
    peggingLog: [],
  };
}

export function dealHands(state: GameState): GameState {
  const deck = shuffle(createDeck());
  const extraCard = hasAbility(state.abilities, 'extra_discard') ? 1 : 0;
  const handSize = 6 + extraCard; // normally 6 cards dealt
  const playerHand = deck.slice(0, handSize);
  const aiHand = deck.slice(handSize, handSize * 2);
  const remaining = deck.slice(handSize * 2);

  const phase: GamePhase = hasAbility(state.abilities, 'peek_starter')
    ? 'peek_starter'
    : 'discard';

  const starter = phase === 'peek_starter' ? remaining[0] : null;

  return {
    ...state,
    deck: remaining,
    player: { ...state.player, hand: playerHand, discards: [] },
    ai: { ...state.ai, hand: aiHand, discards: [] },
    crib: [],
    starter: starter,
    phase,
    pegging: {
      pile: [],
      playedCards: [],
      count: 0,
      playerPassed: false,
      aiPassed: false,
      playerCards: [],
      aiCards: [],
      lastToPlay: null,
      pileResetCount: 0,
    },
    handResult: null,
    swapsLeft: abilityStacks(state.abilities, 'swap_one'),
    luckyRerollAvailable: hasAbility(state.abilities, 'lucky_cut'),
    peggingLog: [],
    handNumber: state.handNumber + 1,
  };
}

export function playerDiscard(state: GameState, cards: Card[]): GameState {
  const discardCount = hasAbility(state.abilities, 'extra_discard') ? 3 : 2;
  if (cards.length !== discardCount) return state;

  const newHand = state.player.hand.filter(
    (c) => !cards.some((d) => d.id === c.id)
  );

  const updated: GameState = {
    ...state,
    player: { ...state.player, hand: newHand, discards: cards },
  };

  if (hasAbility(state.abilities, 'swap_one')) {
    return { ...updated, phase: 'swap' };
  }

  return proceedToPegging(updated);
}

export function playerSwap(state: GameState, cardToSwap: Card | null): GameState {
  if (state.swapsLeft <= 0 || !cardToSwap) {
    return proceedToPegging(state);
  }

  const [newCard, ...remainingDeck] = state.deck;
  const newHand = state.player.hand.map((c) =>
    c.id === cardToSwap.id ? newCard : c
  );

  return proceedToPegging({
    ...state,
    player: { ...state.player, hand: newHand },
    deck: [...remainingDeck, cardToSwap],
    swapsLeft: state.swapsLeft - 1,
  });
}

export function rerollStarter(state: GameState): GameState {
  if (!state.luckyRerollAvailable || state.deck.length === 0) return state;
  const [newStarter, ...rest] = state.deck;
  return {
    ...state,
    starter: newStarter,
    deck: [...rest, state.starter!],
    luckyRerollAvailable: false,
  };
}

function proceedToPegging(state: GameState): GameState {
  // Cut the starter
  const starter = state.starter ?? state.deck[0];
  const deck = state.starter ? state.deck : state.deck.slice(1);

  // His heels (dealer gets 2 if starter is a Jack)
  let playerScore = state.player.score;
  let aiScore = state.ai.score;
  let log: string[] = [];

  if (starter.rank === 'J') {
    if (state.dealer === 'player') {
      playerScore += 2;
      log.push('His heels! Player gets 2 pts');
    } else {
      aiScore += 2;
      log.push('His heels! AI gets 2 pts');
    }
  }

  return {
    ...state,
    deck,
    starter,
    phase: 'pegging',
    player: { ...state.player, score: playerScore },
    ai: { ...state.ai, score: aiScore },
    pegging: {
      pile: [],
      playedCards: [],
      count: 0,
      playerPassed: false,
      aiPassed: false,
      playerCards: [...state.player.hand],
      aiCards: [...state.ai.hand],
      lastToPlay: state.dealer,
      pileResetCount: 0,
    },
    peggingLog: log,
  };
}

export function playerPlayCard(state: GameState, card: Card): GameState {
  const pegging = state.pegging;

  if (!pegging.playerCards.some((c) => c.id === card.id)) return state;
  if (pegging.count + cardValue(card) > 31) return state;

  const newPile = [...pegging.pile, card];
  const newCount = pegging.count + cardValue(card);
  const newPlayerCards = pegging.playerCards.filter((c) => c.id !== card.id);
  const newPlayedCards = [...pegging.playedCards, { card, playedBy: 'player' as const }];

  const score = scorePegging(newPile, card);
  let pts = score.total;

  let log = [...state.peggingLog];
  if (score.details.length > 0) {
    log.push(`Player: ${score.details.join(', ')}`);
  }

  let playerScore = state.player.score + pts;

  let newPegging: PeggingState = {
    ...pegging,
    pile: newPile,
    playedCards: newPlayedCards,
    count: newCount,
    playerCards: newPlayerCards,
    playerPassed: false,
    lastToPlay: 'player',
  };

  // Check for 31 — reset current pile but keep playedCards for display
  if (newCount === 31) {
    log.push(`Player plays to 31! (already scored via scorePegging)`);
    newPegging = { ...newPegging, pile: [], count: 0, playerPassed: false, aiPassed: false, lastToPlay: 'player', pileResetCount: newPegging.pileResetCount + 1 };
  }

  let s = { ...state, player: { ...state.player, score: playerScore }, pegging: newPegging, peggingLog: log };

  // Check win
  if (playerScore >= state.targetScore) {
    return { ...s, winner: 'player', phase: 'round_over' };
  }

  return s;
}

export function playerPass(state: GameState): GameState {
  const pegging = state.pegging;

  const newPegging: PeggingState = { ...pegging, playerPassed: true };
  return { ...state, pegging: newPegging };
}

export function awardGo(state: GameState, recipient: 'player' | 'ai'): GameState {
  const goBonus = hasAbility(state.abilities, 'go_bonus') ? 1 : 0;
  const pts = 1 + goBonus;
  let log = [...state.peggingLog];
  log.push(`${recipient === 'player' ? 'Player' : 'AI'} gets go (+${pts})`);

  if (recipient === 'player') {
    const playerScore = state.player.score + pts;
    if (playerScore >= state.targetScore) {
      return { ...state, player: { ...state.player, score: playerScore }, winner: 'player', phase: 'round_over', peggingLog: log };
    }
    return { ...state, player: { ...state.player, score: playerScore }, peggingLog: log };
  } else {
    const aiScore = state.ai.score + pts;
    if (aiScore >= state.targetScore) {
      return { ...state, ai: { ...state.ai, score: aiScore }, winner: 'ai', phase: 'round_over', peggingLog: log };
    }
    return { ...state, ai: { ...state.ai, score: aiScore }, peggingLog: log };
  }
}

// Reset the pegging pile after a go or 31. goRecipient is the player who received
// the go point; lastToPlay is set to them so the other player leads the next series.
export function resetPeggingPile(state: GameState, goRecipient: 'player' | 'ai'): GameState {
  return {
    ...state,
    pegging: {
      ...state.pegging,
      pile: [],
      count: 0,
      playerPassed: false,
      aiPassed: false,
      lastToPlay: goRecipient,
      pileResetCount: state.pegging.pileResetCount + 1,
    },
  };
}

export function scoreShow(state: GameState): GameState {
  if (!state.starter) return state;

  const abilities = state.abilities;
  const doubleFifteens = hasAbility(abilities, 'double_fifteens');
  const runBonus = abilityStacks(abilities, 'run_bonus');
  const cribThief = hasAbility(abilities, 'steal_crib');

  function applyBonuses(base: import('./scoring').ScoredHand): number {
    let total = base.total;
    if (doubleFifteens) {
      // Already counted at 2x, add another 2x
      const fifteenEntries = base.breakdown.filter((b) => b.description.includes('fifteen'));
      const fifteenPts = fifteenEntries.reduce((s, b) => s + b.points, 0);
      total += fifteenPts; // double them
    }
    if (runBonus > 0) {
      const runEntries = base.breakdown.filter((b) => b.description.includes('Run'));
      for (const r of runEntries) {
        // Add runBonus per card in the run
        const match = r.description.match(/of (\d+)/);
        if (match) {
          total += parseInt(match[1]) * runBonus;
        }
      }
    }
    return total;
  }

  const playerHandScore = scoreHand(state.player.hand, state.starter, false);
  const aiHandScore = scoreHand(state.ai.hand, state.starter, false);
  const cribScore = scoreHand(state.crib.slice(0, 4), state.starter, true);

  const playerHandPts = applyBonuses(playerHandScore);
  const aiHandPts = applyBonuses(aiHandScore);
  const cribPts = applyBonuses(cribScore);

  const cribOwner = state.dealer;
  const cribGoesToPlayer = cribOwner === 'player' || cribThief;

  let playerScore = state.player.score + playerHandPts;
  let aiScore = state.ai.score + aiHandPts;

  if (cribGoesToPlayer) {
    playerScore += cribPts;
  } else {
    aiScore += cribPts;
  }

  const playerHandBreakdown = playerHandScore.breakdown.map((b) => b.description);
  const aiHandBreakdown = aiHandScore.breakdown.map((b) => b.description);
  const cribBreakdown = cribScore.breakdown.map((b) => b.description);

  const handResult: HandResult = {
    playerPegging: 0, // already added during pegging
    aiPegging: 0,
    playerHand: playerHandPts,
    aiHand: aiHandPts,
    crib: cribPts,
    cribOwner: cribGoesToPlayer ? 'player' : 'ai',
    playerTotal: playerScore,
    aiTotal: aiScore,
    playerHandBreakdown,
    aiHandBreakdown,
    cribBreakdown,
  };

  let winner: 'player' | 'ai' | null = null;
  if (playerScore >= state.targetScore) winner = 'player';
  else if (aiScore >= state.targetScore) winner = 'ai';

  return {
    ...state,
    player: { ...state.player, score: playerScore },
    ai: { ...state.ai, score: aiScore },
    handResult,
    phase: winner ? 'round_over' : 'show',
    winner,
    dealer: state.dealer === 'player' ? 'ai' : 'player',
  };
}
