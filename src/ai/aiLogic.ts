import { Card } from '../game/cards';
import { scoreHand } from '../game/scoring';
import {
  CardImprovements,
  getPeggingCard,
  getPlayablePeggingValues,
} from '../game/cardImprovements';

// AI discards: keep the best scoring 4-card combination
export function aiChooseDiscards(
  hand: Card[],
  starter: Card | null,
  improvements: CardImprovements = {},
): Card[] {
  const n = hand.length;
  const keepCount = 4;
  const discardCount = n - keepCount;

  let bestScore = -1;
  let bestDiscard: Card[] = hand.slice(keepCount);

  // Try all combinations of keeping 4 cards
  const combinations = getCombinations(hand, keepCount);
  for (const keep of combinations) {
    // Estimate score without starter (use a dummy)
    const dummyStarter = starter ?? { suit: 'spades', rank: '2', id: 'dummy' };
    const score = scoreHand(keep, dummyStarter, false, improvements).total;
    if (score > bestScore) {
      bestScore = score;
      bestDiscard = hand.filter((c) => !keep.some((k) => k.id === c.id));
    }
  }

  return bestDiscard.slice(0, discardCount);
}

// AI chooses which card to play during pegging
export interface AIPeggingChoice {
  card: Card;
  value: number;
}

export function aiChoosePeggingCard(
  hand: Card[],
  pileCount: number,
  pile: Card[],
  improvements: CardImprovements = {},
): AIPeggingChoice | null {
  const choices = hand.flatMap((card) =>
    getPlayablePeggingValues(card, improvements)
      .filter((value) => value + pileCount <= 31)
      .map((value) => ({ card, value })),
  );
  if (choices.length === 0) return null;

  // Prefer cards that hit 15 or 31, then pairs, then runs
  let best: AIPeggingChoice | null = null;
  let bestScore = -1;

  for (const choice of choices) {
    const { card, value } = choice;
    const playedCard = getPeggingCard(card, improvements);
    const newPile = [...pile, playedCard];
    const newCount = pileCount + value;
    let score = 0;

    if (newCount === 15 || newCount === 31) score += 2;
    // Pair
    if (pile.length > 0 && pile[pile.length - 1].rank === card.rank) score += 2;
    // Prefer not to give player easy points: play lowest card otherwise
    score -= value * 0.01;

    if (score > bestScore) {
      bestScore = score;
      best = choice;
    }
  }

  return best;
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}
