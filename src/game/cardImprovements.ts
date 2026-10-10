import { Card, Rank, createDeck } from './cards';

export type CardImprovementId =
  | 'round_robin'
  | 'blackjack'
  | 'times_two'
  | 'best_hand_ever'
  | 'put_me_in_coach'
  | 'four_on_the_floor'
  | 'gen_z'
  | 'call_my_number'
  | 'kids_these_days'
  | 'robber'
  | 'uno_reverse'
  | 'best_hand';

export interface CardImprovement {
  id: CardImprovementId;
  name: string;
  description: string;
}

export type CardImprovements = Partial<Record<string, CardImprovementId>>;

export const CARD_IMPROVEMENTS: Record<Rank, [CardImprovement, CardImprovement] | []> = {
  A: [
    {
      id: 'round_robin',
      name: 'Round Robin',
      description: 'This Ace can run off a King (K-A-Q).',
    },
    {
      id: 'blackjack',
      name: 'Blackjack',
      description: 'Choose whether this Ace counts as 1 or 11 when played.',
    },
  ],
  '2': [
    {
      id: 'times_two',
      name: 'Times 2',
      description: 'Doubles points scored when this 2 is played; counts as 4 in hand scoring.',
    },
    {
      id: 'best_hand_ever',
      name: 'Best Hand Ever',
      description: 'Scores 2 bonus points when paired with a 9.',
    },
  ],
  '3': [],
  '4': [
    {
      id: 'put_me_in_coach',
      name: 'Put Me in Coach',
      description: 'This 4 counts as 5 during pegging.',
    },
    {
      id: 'four_on_the_floor',
      name: 'Four on the Floor',
      description: 'Scores 4 bonus points for a four-card run.',
    },
  ],
  '5': [],
  '6': [
    {
      id: 'gen_z',
      name: 'Gen Z',
      description: 'Scores 2 bonus points when paired with a 7.',
    },
    {
      id: 'call_my_number',
      name: 'Call My Number',
      description: 'Making 16 with this 6 scores 2 points, just like making 15.',
    },
  ],
  '7': [
    {
      id: 'kids_these_days',
      name: 'Kids These Days',
      description: 'Scores 2 bonus points when paired with a 6.',
    },
    {
      id: 'robber',
      name: 'Robber',
      description: 'Steals points equal to a random card in the opposite hand when played.',
    },
  ],
  '8': [],
  '9': [
    {
      id: 'uno_reverse',
      name: 'Uno Reverse',
      description: 'This 9 can flip to a 6 when played during pegging.',
    },
    {
      id: 'best_hand',
      name: 'Best Hand',
      description: 'Scores 2 bonus points when paired with a 2.',
    },
  ],
  '10': [],
  J: [],
  Q: [],
  K: [],
};

export function getCardImprovement(
  improvements: CardImprovements | null | undefined,
  card: Card,
): CardImprovement | null {
  const id = improvements?.[card.id];
  return id ? Object.values(CARD_IMPROVEMENTS).flat().find((item) => item.id === id) ?? null : null;
}

export function getCardImprovementById(id: CardImprovementId): CardImprovement {
  return Object.values(CARD_IMPROVEMENTS).flat().find((item) => item.id === id)!;
}

export function rollCardImprovementChoices(
  improvements: CardImprovements,
  count = 3,
): Card[] {
  const available = createDeck().filter(
    (card) => CARD_IMPROVEMENTS[card.rank].length > 0 && !improvements[card.id],
  );
  for (let index = available.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }
  return available.slice(0, count);
}
