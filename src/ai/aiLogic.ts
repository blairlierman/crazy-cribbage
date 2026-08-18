import { Card, cardValue } from '../game/cards';
import { scoreHand } from '../game/scoring';

// AI discards: keep the best scoring 4-card combination
export function aiChooseDiscards(hand: Card[], starter: Card | null): Card[] {
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
    const score = scoreHand(keep, dummyStarter, false).total;
    if (score > bestScore) {
      bestScore = score;
      bestDiscard = hand.filter((c) => !keep.some((k) => k.id === c.id));
    }
  }

  return bestDiscard.slice(0, discardCount);
}

// AI chooses which card to play during pegging
export function aiChoosePeggingCard(
  hand: Card[],
  pileCount: number,
  pile: Card[]
): Card | null {
  const playable = hand.filter((c) => cardValue(c) + pileCount <= 31);
  if (playable.length === 0) return null;

  // Prefer cards that hit 15 or 31, then pairs, then runs
  let best: Card | null = null;
  let bestScore = -1;

  for (const card of playable) {
    const newPile = [...pile, card];
    const newCount = pileCount + cardValue(card);
    let score = 0;

    if (newCount === 15 || newCount === 31) score += 2;
    // Pair
    if (pile.length > 0 && pile[pile.length - 1].rank === card.rank) score += 2;
    // Prefer not to give player easy points: play lowest card otherwise
    score -= cardValue(card) * 0.01;

    if (score > bestScore) {
      bestScore = score;
      best = card;
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
