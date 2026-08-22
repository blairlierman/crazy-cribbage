import { Card, cardOrder, cardValue, RANKS } from './cards';

// Score a hand plus a starter card (show scoring)
export interface ScoredHand {
  total: number;
  breakdown: ScoringDetail[];
}

export interface ScoringDetail {
  points: number;
  description: string;
}

export function scoreHand(hand: Card[], starter: Card, isCrib = false): ScoredHand {
  const cards = [...hand, starter];
  const breakdown: ScoringDetail[] = [];
  let total = 0;

  const add = (points: number, description: string) => {
    breakdown.push({ points, description });
    total += points;
  };

  // Fifteens
  const fifteens = countFifteens(cards);
  if (fifteens > 0)
    add(fifteens * 2, `${fifteens} fifteen${fifteens > 1 ? 's' : ''} (${fifteens * 2} pts)`);

  // Pairs
  const pairsScore = countPairs(cards);
  if (pairsScore > 0) add(pairsScore, `Pairs (${pairsScore} pts)`);

  // Runs
  const runsScore = countRuns(cards);
  if (runsScore > 0) add(runsScore, `Runs (${runsScore} pts)`);

  // Flush
  const flushScore = countFlush(hand, starter, isCrib);
  if (flushScore > 0) add(flushScore, `Flush (${flushScore} pts)`);

  // His nobs (Jack matching starter suit in hand)
  const nobsScore = countNobs(hand, starter);
  if (nobsScore > 0) add(nobsScore, 'His nobs (1 pt)');

  return { total, breakdown };
}

function countFifteens(cards: Card[]): number {
  let count = 0;
  const n = cards.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) sum += cardValue(cards[i]);
    }
    if (sum === 15) count++;
  }
  return count;
}

function countPairs(cards: Card[]): number {
  let score = 0;
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) score += 2;
    }
  }
  return score;
}

function countRuns(cards: Card[]): number {
  // Find longest runs and count them
  const orders = cards.map((c) => cardOrder(c)).sort((a, b) => a - b);

  // Count occurrences of each rank order
  const counts: Record<number, number> = {};
  for (const o of orders) {
    counts[o] = (counts[o] || 0) + 1;
  }
  const unique = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);

  let score = 0;
  let i = 0;
  while (i < unique.length) {
    // Find the length of the run starting at i
    let runLen = 1;
    let multiplier = counts[unique[i]];
    let j = i + 1;
    while (j < unique.length && unique[j] === unique[j - 1] + 1) {
      multiplier *= counts[unique[j]];
      runLen++;
      j++;
    }
    if (runLen >= 3) {
      score += runLen * multiplier;
      i = j;
    } else {
      i++;
    }
  }
  return score;
}

function countFlush(hand: Card[], starter: Card, isCrib: boolean): number {
  // All hand cards same suit
  const suit = hand[0].suit;
  if (hand.every((c) => c.suit === suit)) {
    if (starter.suit === suit) return 5;
    if (!isCrib) return 4;
  }
  return 0;
}

function countNobs(hand: Card[], starter: Card): number {
  return hand.some((c) => c.rank === 'J' && c.suit === starter.suit) ? 1 : 0;
}

// Pegging scoring: given the play pile and the card just played, score it
export interface PeggingScore {
  total: number;
  details: string[];
}

export function scorePegging(pile: Card[], justPlayed: Card): PeggingScore {
  const details: string[] = [];
  let total = 0;

  const add = (pts: number, desc: string) => {
    total += pts;
    details.push(desc);
  };

  const sum = pile.reduce((s, c) => s + cardValue(c), 0);

  // 15 or 31
  if (sum === 15) add(2, 'Fifteen for 2');
  if (sum === 31) add(2, '31 for 2');

  // Pairs from top of pile
  const topSame = countPairsFromTop(pile);
  if (topSame === 2) add(2, 'Pair for 2');
  else if (topSame === 3) add(6, 'Three of a kind for 6');
  else if (topSame === 4) add(12, 'Four of a kind for 12');

  // Runs from top of pile
  const runLen = longestRunFromTop(pile);
  if (runLen >= 3) add(runLen, `Run of ${runLen} for ${runLen}`);

  // Last card (go) = 1 – handled externally

  return { total, details };
}

function countPairsFromTop(pile: Card[]): number {
  if (pile.length < 2) return 0;
  const topRank = pile[pile.length - 1].rank;
  let count = 0;
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].rank === topRank) count++;
    else break;
  }
  return count;
}

function longestRunFromTop(pile: Card[]): number {
  for (let len = pile.length; len >= 3; len--) {
    const slice = pile.slice(pile.length - len);
    const orders = slice.map((c) => cardOrder(c)).sort((a, b) => a - b);
    const isRun = orders.every((v, i) => i === 0 || v === orders[i - 1] + 1);
    const unique = new Set(orders).size === orders.length;
    if (isRun && unique) return len;
  }
  return 0;
}

export { RANKS };
