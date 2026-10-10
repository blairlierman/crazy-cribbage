import { Card, Rank, cardOrder, cardValue, RANKS } from './cards';
import {
  CardImprovementId,
  CardImprovements,
  getCardImprovement,
  getPeggingValue,
} from './cardImprovements';

// Score a hand plus a starter card (show scoring)
export interface ScoredHand {
  total: number;
  breakdown: ScoringDetail[];
}

export interface ScoringDetail {
  points: number;
  description: string;
}

export function scoreHand(
  hand: Card[],
  starter: Card,
  isCrib = false,
  improvements: CardImprovements = {},
): ScoredHand {
  const cards = [...hand, starter];
  const breakdown: ScoringDetail[] = [];
  let total = 0;

  const add = (points: number, description: string) => {
    breakdown.push({ points, description });
    total += points;
  };

  // Fifteens
  const fifteens = countFifteens(cards, improvements);
  if (fifteens > 0)
    add(fifteens * 2, `${fifteens} fifteen${fifteens > 1 ? 's' : ''} (${fifteens * 2} pts)`);

  const sixteens = countSixteens(cards, improvements);
  if (sixteens > 0)
    add(sixteens * 2, `${sixteens} sixteen${sixteens > 1 ? 's' : ''} (${sixteens * 2} pts)`);

  // Pairs
  const pairsScore = countPairs(cards);
  if (pairsScore > 0) add(pairsScore, `Pairs (${pairsScore} pts)`);

  // Runs
  const runsScore = countRuns(cards, improvements);
  if (runsScore > 0) add(runsScore, `Runs (${runsScore} pts)`);

  const partnershipScore = countImprovedPairs(cards, improvements);
  if (partnershipScore > 0) add(partnershipScore, `Card improvements (${partnershipScore} pts)`);

  const fourOnTheFloor = cards.some(
    (card) =>
      card.rank === '4' && getCardImprovement(improvements, card)?.id === 'four_on_the_floor',
  );
  if (fourOnTheFloor && getRunLengths(cards, improvements).some((length) => length === 4)) {
    add(4, 'Four on the Floor (+4)');
  }

  // Flush
  const flushScore = countFlush(hand, starter, isCrib);
  if (flushScore > 0) add(flushScore, `Flush (${flushScore} pts)`);

  // His nobs (Jack matching starter suit in hand)
  const nobsScore = countNobs(hand, starter);
  if (nobsScore > 0) add(nobsScore, 'His nobs (1 pt)');

  return { total, breakdown };
}

function countFifteens(cards: Card[], improvements: CardImprovements = {}): number {
  let count = 0;
  const n = cards.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += getCountingValue(cards[i], improvements);
      }
    }
    if (sum === 15) count++;
  }
  return count;
}

function countSixteens(cards: Card[], improvements: CardImprovements): number {
  let count = 0;
  for (let mask = 1; mask < 1 << cards.length; mask++) {
    let sum = 0;
    let hasCallMyNumber = false;
    for (let index = 0; index < cards.length; index++) {
      if (!(mask & (1 << index))) continue;
      sum += getCountingValue(cards[index], improvements);
      hasCallMyNumber ||= getCardImprovement(improvements, cards[index])?.id === 'call_my_number';
    }
    if (sum === 16 && hasCallMyNumber) count++;
  }
  return count;
}

function getCountingValue(card: Card, improvements: CardImprovements): number {
  return card.rank === '2' && getCardImprovement(improvements, card)?.id === 'times_two'
    ? 4
    : cardValue(card);
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

function countRuns(cards: Card[], improvements: CardImprovements = {}): number {
  return getRunLengths(cards, improvements).reduce((score, length) => score + length, 0);
}

function getRunLengths(cards: Card[], improvements: CardImprovements = {}): number[] {
  const aceIndexes = cards.flatMap((card, index) =>
    card.rank === 'A' && getCardImprovement(improvements, card)?.id === 'round_robin'
      ? [index]
      : [],
  );
  let bestLengths: number[] = [];
  const aceVariants = 1 << aceIndexes.length;
  for (let variant = 0; variant < aceVariants; variant++) {
    const orders = cards.map((card, index) => {
      const aceIndex = aceIndexes.indexOf(index);
      return aceIndex < 0 ? cardOrder(card) : variant & (1 << aceIndex) ? 14 : 1;
    });
    const lengths = getRunLengthsForOrders(orders);
    if (sumRunLengths(lengths) > sumRunLengths(bestLengths)) bestLengths = lengths;
  }
  return bestLengths;
}

function getRunLengthsForOrders(orders: number[]): number[] {
  const sortedOrders = [...orders].sort((a, b) => a - b);
  // Count occurrences of each rank order
  const counts: Record<number, number> = {};
  for (const o of sortedOrders) {
    counts[o] = (counts[o] || 0) + 1;
  }
  const unique = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);

  const runLengths: number[] = [];
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
      for (let count = 0; count < multiplier; count++) runLengths.push(runLen);
      i = j;
    } else {
      i++;
    }
  }
  return runLengths;
}

function sumRunLengths(lengths: number[]): number {
  return lengths.reduce((sum, length) => sum + length, 0);
}

function countImprovedPairs(cards: Card[], improvements: CardImprovements): number {
  let points = 0;
  for (let i = 0; i < cards.length; i++) {
    const improvement = getCardImprovement(improvements, cards[i])?.id;
    const partnerRank =
      improvement === 'best_hand_ever'
        ? '9'
        : improvement === 'best_hand'
          ? '2'
          : improvement === 'gen_z'
            ? '7'
            : improvement === 'kids_these_days'
              ? '6'
              : null;
    if (!partnerRank) continue;
    points +=
      cards.filter((card) => card.id !== cards[i].id && card.rank === partnerRank).length * 2;
  }
  return points;
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

export function scorePegging(
  pile: Card[],
  justPlayed: Card,
  improvements: CardImprovements = {},
  pileValues?: number[],
): PeggingScore {
  const details: string[] = [];
  let total = 0;

  const add = (pts: number, desc: string) => {
    total += pts;
    details.push(desc);
  };

  const values = pileValues ?? pile.map((card) => getPeggingValue(card, improvements));
  const sum = values.reduce((total, value) => total + value, 0);

  // 15 or 31
  if (sum === 15) add(2, 'Fifteen for 2');
  if (sum === 31) add(2, '31 for 2');

  // Pairs from top of pile
  const topSame = countPairsFromTop(pile);
  if (topSame === 2) add(2, 'Pair for 2');
  else if (topSame === 3) add(6, 'Three of a kind for 6');
  else if (topSame === 4) add(12, 'Four of a kind for 12');

  // Runs from top of pile
  const runLen = longestRunFromTop(pile, improvements);
  if (runLen >= 3) add(runLen, `Run of ${runLen} for ${runLen}`);

  const improvement = getCardImprovement(improvements, justPlayed)?.id;
  if (improvement === 'call_my_number' && sum === 16) add(2, '16 for 2');

  const partnerImprovements: Array<[CardImprovementId, Rank]> = [
    ['best_hand_ever', '9'],
    ['best_hand', '2'],
    ['gen_z', '7'],
    ['kids_these_days', '6'],
  ];
  for (const [id, partnerRank] of partnerImprovements) {
    const improvedCards = pile.filter((card) => getCardImprovement(improvements, card)?.id === id);
    const pairCount =
      justPlayed.rank === partnerRank
        ? improvedCards.filter((card) => card.id !== justPlayed.id).length
        : getCardImprovement(improvements, justPlayed)?.id === id
          ? pile.filter((card) => card.id !== justPlayed.id && card.rank === partnerRank).length
          : 0;
    const scoringCard = improvedCards.find((card) => card.id === justPlayed.id) ?? improvedCards[0];
    if (pairCount > 0 && scoringCard) {
      add(
        pairCount * 2,
        `${getCardImprovement(improvements, scoringCard)!.name} (+${pairCount * 2})`,
      );
    }
  }

  const fourOnTheFloor =
    runLen === 4 &&
    pile
      .slice(-runLen)
      .some(
        (card) =>
          card.rank === '4' && getCardImprovement(improvements, card)?.id === 'four_on_the_floor',
      );
  if (fourOnTheFloor) add(4, 'Four on the Floor (+4)');

  if (improvement === 'times_two' && total > 0) {
    total *= 2;
    details.push('Times 2 doubles pegging points');
  }

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

function longestRunFromTop(pile: Card[], improvements: CardImprovements): number {
  for (let len = pile.length; len >= 3; len--) {
    const slice = pile.slice(pile.length - len);
    const aceIndexes = slice.flatMap((card, index) =>
      card.rank === 'A' && getCardImprovement(improvements, card)?.id === 'round_robin'
        ? [index]
        : [],
    );
    for (let variant = 0; variant < 1 << aceIndexes.length; variant++) {
      const orders = slice
        .map((card, index) => {
          const aceIndex = aceIndexes.indexOf(index);
          return aceIndex < 0 ? cardOrder(card) : variant & (1 << aceIndex) ? 14 : 1;
        })
        .sort((a, b) => a - b);
      const isRun = orders.every((value, index) => index === 0 || value === orders[index - 1] + 1);
      if (isRun && new Set(orders).size === orders.length) return len;
    }
  }
  return 0;
}

export { RANKS };
