import { Card, Rank, cardValue, createDeck } from './cards';

export type CardImprovementId =
  | 'round_robin'
  | 'blackjack'
  | 'times_two'
  | 'best_hand_ever'
  | 'triple_threat'
  | 'third_wheel'
  | 'put_me_in_coach'
  | 'four_on_the_floor'
  | 'high_five'
  | 'five_alive'
  | 'gen_z'
  | 'call_my_number'
  | 'kids_these_days'
  | 'robber'
  | 'crazy_eight'
  | 'eight_ball'
  | 'uno_reverse'
  | 'best_hand'
  | 'perfect_ten'
  | 'tenacious'
  | 'jackpot'
  | 'jack_of_trades'
  | 'queens_court'
  | 'royal_flush'
  | 'kings_ransom'
  | 'crown_jewels';

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
  '3': [
    {
      id: 'triple_threat',
      name: 'Triple Threat',
      description: 'Scores 2 bonus points when this 3 completes a pegging run.',
    },
    {
      id: 'third_wheel',
      name: 'Third Wheel',
      description: 'Scores 2 bonus points if the scored hand contains exactly 3 distinct ranks.',
    },
  ],
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
  '5': [
    {
      id: 'high_five',
      name: 'High Five',
      description: 'Scores 1 bonus point when this 5 makes 15 in pegging.',
    },
    {
      id: 'five_alive',
      name: 'Five Alive',
      description: 'Scores 2 bonus points if the hand base score is at least 10.',
    },
  ],
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
  '8': [
    {
      id: 'crazy_eight',
      name: 'Crazy Eight',
      description: 'Choose whether this 8 counts as 1 or 8 during pegging.',
    },
    {
      id: 'eight_ball',
      name: 'Eight Ball',
      description: 'Scores 2 bonus points if the scored hand contains a pair.',
    },
  ],
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
  '10': [
    {
      id: 'perfect_ten',
      name: 'Perfect Ten',
      description: 'Scores 2 bonus points when this 10 makes 20 in pegging.',
    },
    {
      id: 'tenacious',
      name: 'Tenacious',
      description: 'Scores 2 bonus points when this 10 is the last card of a pegging sequence.',
    },
  ],
  J: [
    {
      id: 'jackpot',
      name: 'Jackpot',
      description: 'Scores 2 bonus points when this Jack scores nobs.',
    },
    {
      id: 'jack_of_trades',
      name: 'Jack of Trades',
      description: 'Scores 2 bonus points if the scored hand contains both a pair and a run.',
    },
  ],
  Q: [
    {
      id: 'queens_court',
      name: "Queen's Court",
      description: 'Scores 2 bonus points if scored with a Jack or King.',
    },
    {
      id: 'royal_flush',
      name: 'Royal Flush',
      description: 'Scores 2 bonus points for a scoring flush.',
    },
  ],
  K: [
    {
      id: 'kings_ransom',
      name: "King's Ransom",
      description: 'Scores 2 bonus points when this King makes 31 in pegging.',
    },
    {
      id: 'crown_jewels',
      name: 'Crown Jewels',
      description: 'Scores 2 bonus points for a scoring flush or a run of at least 4.',
    },
  ],
};

export function getCardImprovement(
  improvements: CardImprovements | null | undefined,
  card: Card,
): CardImprovement | null {
  const id = improvements?.[card.id];
  return id
    ? (Object.values(CARD_IMPROVEMENTS)
        .flat()
        .find((item) => item.id === id) ?? null)
    : null;
}

export function getCardImprovementById(id: CardImprovementId): CardImprovement {
  return Object.values(CARD_IMPROVEMENTS)
    .flat()
    .find((item) => item.id === id)!;
}

export function getPeggingCard(card: Card, improvements: CardImprovements): Card {
  return getCardImprovement(improvements, card)?.id === 'uno_reverse'
    ? { ...card, rank: '6' }
    : card;
}

export function getPeggingValue(
  card: Card,
  improvements: CardImprovements,
  chosenValue?: number,
): number {
  const improvement = getCardImprovement(improvements, card)?.id;
  if (improvement === 'put_me_in_coach') return 5;
  if (improvement === 'uno_reverse') return 6;
  if (improvement === 'blackjack') return chosenValue ?? 1;
  if (improvement === 'crazy_eight') return chosenValue === 1 ? 1 : 8;
  return cardValue(card);
}

export function getPlayablePeggingValues(card: Card, improvements: CardImprovements): number[] {
  const improvement = getCardImprovement(improvements, card)?.id;
  if (improvement === 'blackjack') return [1, 11];
  if (improvement === 'crazy_eight') return [1, 8];
  return [getPeggingValue(card, improvements)];
}

export function canPlayPeggingCard(
  card: Card,
  count: number,
  improvements: CardImprovements,
): boolean {
  return getPlayablePeggingValues(card, improvements).some((value) => count + value <= 31);
}

export function stealRobberPoints(
  card: Card,
  opposingCards: Card[],
  opposingScore: number,
  improvements: CardImprovements,
): number {
  if (
    getCardImprovement(improvements, card)?.id !== 'robber' ||
    opposingCards.length === 0 ||
    opposingScore <= 0
  ) {
    return 0;
  }
  const target = opposingCards[Math.floor(Math.random() * opposingCards.length)];
  return Math.min(opposingScore, cardValue(target));
}

export function rollCardImprovementChoices(improvements: CardImprovements, count = 3): Card[] {
  const available = createDeck().filter(
    (card) => CARD_IMPROVEMENTS[card.rank].length > 0 && !improvements[card.id],
  );
  for (let index = available.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }
  return available.slice(0, count);
}
