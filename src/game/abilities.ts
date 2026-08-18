export type AbilityId =
  | 'extra_discard'       // can discard 3 cards to crib instead of 2
  | 'peek_starter'        // see the starter card before discarding
  | 'swap_one'            // swap 1 card in hand with top of deck
  | 'steal_crib'          // when AI has crib, you score it instead
  | 'double_fifteens'     // fifteens count for 4 pts each instead of 2
  | 'run_bonus'           // runs score +1 extra per card
  | 'lucky_cut'           // reroll the starter card once per hand
  | 'extra_hand_card'     // deal 7 cards, discard 3 (keep 4 + extra for scoring)
  | 'go_bonus'            // go = 2 pts instead of 1
  | 'crib_insight';       // see 1 card in opponent crib before show

export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
  maxStacks: number;
}

export const ALL_ABILITIES: Ability[] = [
  {
    id: 'extra_discard',
    name: 'Extra Discard',
    description: 'Deal 7 cards; discard 3 to the crib instead of 2.',
    maxStacks: 1,
  },
  {
    id: 'peek_starter',
    name: 'Peek Starter',
    description: 'See the starter card before choosing your discards.',
    maxStacks: 1,
  },
  {
    id: 'swap_one',
    name: 'Card Swap',
    description: 'Once per hand, swap one card from your hand with the top of the deck.',
    maxStacks: 2,
  },
  {
    id: 'steal_crib',
    name: 'Crib Thief',
    description: "When it's the AI's crib, you score it instead.",
    maxStacks: 1,
  },
  {
    id: 'double_fifteens',
    name: 'Power Fifteens',
    description: 'Each fifteen combination scores 4 points instead of 2.',
    maxStacks: 1,
  },
  {
    id: 'run_bonus',
    name: 'Run Bonus',
    description: 'Each card in a run scores 1 extra point.',
    maxStacks: 2,
  },
  {
    id: 'lucky_cut',
    name: 'Lucky Cut',
    description: 'Once per hand, you may recut for a new starter card.',
    maxStacks: 1,
  },
  {
    id: 'go_bonus',
    name: 'Go Bonus',
    description: 'Going go scores 2 points instead of 1.',
    maxStacks: 1,
  },
  {
    id: 'crib_insight',
    name: 'Crib Insight',
    description: "Reveal 1 card from the opponent's crib before scoring.",
    maxStacks: 1,
  },
];

export type UnlockedAbilities = Partial<Record<AbilityId, number>>; // id -> stacks

export function getAbility(id: AbilityId): Ability {
  return ALL_ABILITIES.find((a) => a.id === id)!;
}

export function abilityStacks(abilities: UnlockedAbilities, id: AbilityId): number {
  return abilities[id] ?? 0;
}

export function hasAbility(abilities: UnlockedAbilities, id: AbilityId): boolean {
  return abilityStacks(abilities, id) > 0;
}

// Pick 3 random abilities to offer as upgrade choices
export function rollAbilityChoices(
  current: UnlockedAbilities,
  count = 3
): Ability[] {
  const available = ALL_ABILITIES.filter(
    (a) => (current[a.id] ?? 0) < a.maxStacks
  );
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
