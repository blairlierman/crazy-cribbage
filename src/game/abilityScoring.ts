import { hasAbility, abilityStacks, UnlockedAbilities } from './abilities';
import { Card } from './cards';
import { PeggingScore, ScoredHand, ScoringDetail } from './scoring';

export interface WheelEffect {
  id:
    | 'fortune_plus_two'
    | 'fortune_minus_two'
    | 'pair_bonus'
    | 'pair_penalty'
    | 'fifteen_bonus'
    | 'fifteen_penalty';
  name: string;
  description: string;
  points: number;
  per?: 'pair' | 'fifteen';
}

export const WHEEL_EFFECTS: readonly WheelEffect[] = [
  { id: 'fortune_plus_two', name: 'Good Fortune', description: '+2 points per hand', points: 2 },
  { id: 'fortune_minus_two', name: 'Hard Times', description: '-2 points per hand', points: -2 },
  {
    id: 'pair_bonus',
    name: 'Lucky Pairs',
    description: '+1 per pair (max 3)',
    points: 1,
    per: 'pair',
  },
  {
    id: 'pair_penalty',
    name: 'Broken Pairs',
    description: '-1 per pair (max 3)',
    points: -1,
    per: 'pair',
  },
  {
    id: 'fifteen_bonus',
    name: 'Lucky Fifteens',
    description: '+1 per fifteen (max 3)',
    points: 1,
    per: 'fifteen',
  },
  {
    id: 'fifteen_penalty',
    name: 'Unlucky Fifteens',
    description: '-1 per fifteen (max 3)',
    points: -1,
    per: 'fifteen',
  },
];

export function rollWheelEffect(random: () => number = Math.random): WheelEffect {
  return { ...WHEEL_EFFECTS[Math.floor(random() * WHEEL_EFFECTS.length)] };
}

// Pass abilities only for the side receiving the score; pass null for an uncontrolled side.
export function applyShowAbilityBonuses(
  base: ScoredHand,
  hand: Card[],
  starter: Card,
  isCrib: boolean,
  abilities: UnlockedAbilities | null | undefined,
  wheelEffect: WheelEffect | null,
): ScoredHand {
  const breakdown: ScoringDetail[] = [...base.breakdown];
  let total = base.total;
  const add = (points: number, name: string) => {
    if (!points) return;
    total += points;
    breakdown.push({ points, description: `${name} (${points > 0 ? '+' : ''}${points})` });
  };
  const pointsFor = (pattern: RegExp) =>
    base.breakdown
      .filter((entry) => pattern.test(entry.description))
      .reduce((n, b) => n + b.points, 0);

  if (hasAbility(abilities, 'double_fifteens')) {
    add(pointsFor(/\bfifteens?\b/i), 'Power Fifteens');
  }
  add(pointsFor(/^runs?\b/i) * abilityStacks(abilities, 'run_bonus'), 'Run Bonus');
  if (hasAbility(abilities, 'pair_specialist')) {
    add(pointsFor(/^pairs?\b/i) / 2, 'Pair Specialist');
  }
  if (hasAbility(abilities, 'flush_fund') && pointsFor(/^flush\b/i) > 0) add(2, 'Flush Fund');
  if (hasAbility(abilities, 'noble_jack') && pointsFor(/\bnobs\b/i) > 0) add(2, 'Noble Jack');
  if (isCrib && hasAbility(abilities, 'crib_builder')) add(2, 'Crib Builder');
  if (!isCrib && base.total < 4 && hasAbility(abilities, 'safety_net')) add(2, 'Safety Net');

  const cards = [...hand, starter];
  const rankCounts = new Map<Card['rank'], number>();
  for (const card of cards) rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
  if (
    hasAbility(abilities, 'double_trouble') &&
    [...rankCounts.values()].filter((n) => n >= 2).length >= 2
  ) {
    add(3, 'Double Trouble');
  }
  if (
    hasAbility(abilities, 'royal_treatment') &&
    ['J', 'Q', 'K'].every((rank) => cards.some((card) => card.rank === rank))
  ) {
    add(3, 'Royal Treatment');
  }
  if (hasAbility(abilities, '777')) {
    add([...rankCounts.values()].filter((count) => count === 3).length, '777');
  }
  if (!isCrib && wheelEffect && hasAbility(abilities, 'wheel_of_fortune')) {
    const occurrences =
      wheelEffect.per === 'pair'
        ? pointsFor(/^pairs?\b/i) / 2
        : wheelEffect.per === 'fifteen'
          ? pointsFor(/\bfifteens?\b/i) / 2
          : 1;
    add(wheelEffect.points * Math.min(occurrences, 3), `Wheel of Fortune: ${wheelEffect.name}`);
  }
  if (total < 0) add(-total, 'Score floor');
  return { total, breakdown };
}

export interface AbilityPeggingBonus {
  bonus: number;
  descriptions: string[];
}

// The pile includes the just-played card; count is the actual pegging count.
export function getPeggingAbilityBonuses(
  pile: Card[],
  count: number,
  base: PeggingScore,
  abilities: UnlockedAbilities | null | undefined,
  firstScoreAvailable: boolean,
): AbilityPeggingBonus {
  let bonus = 0;
  const descriptions: string[] = [];
  const add = (points: number, name: string) => {
    bonus += points;
    descriptions.push(`${name} (+${points})`);
  };
  if (base.total > 0 && firstScoreAvailable && hasAbility(abilities, 'first_blood'))
    add(2, 'First Blood');
  if (count === 31 && hasAbility(abilities, 'thirty_one_club')) add(2, 'Thirty-One Club');
  if (pile.length >= 3 && hasAbility(abilities, '777')) {
    const rank = pile[pile.length - 1].rank;
    let matching = 0;
    for (let i = pile.length - 1; i >= 0 && pile[i].rank === rank; i--) matching++;
    if (matching === 3) add(1, '777');
  }
  return { bonus, descriptions };
}

// Call only when go or last card actually awards a point, not on 31.
export function getLastCardAbilityBonuses(
  abilities: UnlockedAbilities | null | undefined,
  firstScoreAvailable: boolean,
): AbilityPeggingBonus {
  let bonus = 0;
  const descriptions: string[] = [];
  if (hasAbility(abilities, 'last_word')) {
    bonus++;
    descriptions.push('Last Word (+1)');
  }
  if (firstScoreAvailable && hasAbility(abilities, 'first_blood')) {
    bonus += 2;
    descriptions.push('First Blood (+2)');
  }
  return { bonus, descriptions };
}
