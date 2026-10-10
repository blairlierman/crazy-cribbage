import { Card } from '../src/game/cards';
import {
  CARD_IMPROVEMENTS,
  canPlayPeggingCard,
  getCardImprovement,
  getCardImprovementById,
  getPeggingCard,
  getPeggingValue,
  getPlayablePeggingValues,
  rollCardImprovementChoices,
  stealRobberPoints,
} from '../src/game/cardImprovements';

function makeCard(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

describe('card improvements', () => {
  it('offers three distinct eligible cards and excludes cards already improved', () => {
    const choices = rollCardImprovementChoices({ 'A-spades': 'round_robin' });
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((card) => card.id)).size).toBe(3);
    expect(choices.some((card) => card.id === 'A-spades')).toBe(false);
    expect(choices.every((card) => CARD_IMPROVEMENTS[card.rank].length === 2)).toBe(true);
  });

  it('returns improvement details for the specific suit and card', () => {
    const ace = makeCard('A', 'hearts');
    expect(getCardImprovement({ 'A-hearts': 'blackjack' }, ace)).toEqual({
      id: 'blackjack',
      name: 'Blackjack',
      description: 'Choose whether this Ace counts as 1 or 11 when played.',
    });
    expect(getCardImprovement({}, ace)).toBeNull();
    expect(getCardImprovementById('robber').name).toBe('Robber');
  });

  it('calculates pegging card faces and values', () => {
    const four = makeCard('4');
    const ace = makeCard('A');
    const nine = makeCard('9');
    const improvements = {
      '4-spades': 'put_me_in_coach' as const,
      'A-spades': 'blackjack' as const,
      '9-spades': 'uno_reverse' as const,
    };

    expect(getPeggingValue(four, improvements)).toBe(5);
    expect(getPeggingValue(ace, improvements, 11)).toBe(11);
    expect(getPeggingValue(nine, improvements)).toBe(6);
    expect(getPeggingCard(nine, improvements)).toEqual({ ...nine, rank: '6' });
    expect(getPeggingCard(four, improvements)).toBe(four);
    expect(getPlayablePeggingValues(ace, improvements)).toEqual([1, 11]);
    expect(canPlayPeggingCard(ace, 21, improvements)).toBe(true);
    expect(canPlayPeggingCard(ace, 31, {})).toBe(false);
  });

  it('steals a random opposing card value without exceeding the opponent score', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const robber = makeCard('7');
    expect(stealRobberPoints(robber, [makeCard('9')], 8, { '7-spades': 'robber' })).toBe(8);
    expect(stealRobberPoints(robber, [], 8, { '7-spades': 'robber' })).toBe(0);
    expect(stealRobberPoints(robber, [makeCard('9')], 0, { '7-spades': 'robber' })).toBe(0);
    expect(stealRobberPoints(robber, [makeCard('9')], 8, {})).toBe(0);
    jest.restoreAllMocks();
  });
});
