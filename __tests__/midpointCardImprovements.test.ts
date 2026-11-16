import { Card } from '../src/game/cards';
import {
  CARD_IMPROVEMENTS,
  CardImprovementId,
  canPlayPeggingCard,
  getPeggingValue,
  getPlayablePeggingValues,
} from '../src/game/cardImprovements';
import { scoreHand, scorePegging, scorePeggingLastCard } from '../src/game/scoring';

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

function bonus(hand: Card[], starter: Card, id: CardImprovementId, isCrib = false): number {
  const improvement = { [hand[0].id]: id };
  return (
    scoreHand(hand, starter, isCrib, improvement).total - scoreHand(hand, starter, isCrib).total
  );
}

describe('midpoint card improvements', () => {
  it('offers two improvements for each newly eligible rank', () => {
    for (const rank of ['3', '5', '8', '10', 'J', 'Q', 'K'] as const) {
      expect(CARD_IMPROVEMENTS[rank]).toHaveLength(2);
    }
  });

  it('supports either Crazy Eight value without changing its rank', () => {
    const eight = card('8');
    const improvements = { [eight.id]: 'crazy_eight' as const };
    expect(getPeggingValue(eight, improvements)).toBe(8);
    expect(getPeggingValue(eight, improvements, 1)).toBe(1);
    expect(getPeggingValue(eight, improvements, 8)).toBe(8);
    expect(getPeggingValue(eight, improvements, 11)).toBe(8);
    expect(getPlayablePeggingValues(eight, improvements)).toEqual([1, 8]);
    expect(canPlayPeggingCard(eight, 30, improvements)).toBe(true);
    expect(canPlayPeggingCard(eight, 31, improvements)).toBe(false);
    expect(scorePegging([card('7'), eight], eight, improvements, [7, 8]).total).toBe(2);
    expect(scorePegging([card('7'), eight], eight, improvements, [7, 1]).total).toBe(0);
  });

  it.each([
    ['triple_threat', [card('A'), card('2'), card('3')], 2],
    ['high_five', [card('10'), card('5')], 1],
    ['perfect_ten', [card('K'), card('10')], 2],
    ['kings_ransom', [card('8'), card('6'), card('7'), card('K')], 2],
  ] as const)('scores %s only on the qualifying play', (id, pile, extra) => {
    const played = pile[pile.length - 1];
    expect(
      scorePegging([...pile], played, { [played.id]: id }).total -
        scorePegging([...pile], played).total,
    ).toBe(extra);
    expect(
      scorePegging([played], played, { [played.id]: id }).total -
        scorePegging([played], played).total,
    ).toBe(0);
  });

  it('only awards Triple Threat when the improved three completes the run', () => {
    const three = card('3');
    const four = card('4');
    const pile = [card('2'), three, four];
    expect(scorePegging(pile, four, { [three.id]: 'triple_threat' }).total).toBe(
      scorePegging(pile, four).total,
    );
  });

  it('scores Tenacious on 31 and exposes a separate go/last-card bonus', () => {
    const ten = card('10');
    const improvements = { [ten.id]: 'tenacious' as const };
    const pile = [card('7'), card('6'), card('8'), ten];
    expect(scorePegging(pile, ten, improvements).total - scorePegging(pile, ten).total).toBe(2);
    expect(scorePegging([ten], ten, improvements).total).toBe(0);
    expect(scorePeggingLastCard(ten, improvements)).toEqual({
      total: 2,
      details: ['Tenacious (+2)'],
    });
    expect(scorePeggingLastCard(ten)).toEqual({ total: 0, details: [] });
  });

  it.each([
    ['third_wheel', [card('3'), card('3', 'hearts'), card('7'), card('7', 'clubs')], card('K')],
    [
      'five_alive',
      [card('5'), card('5', 'hearts'), card('5', 'clubs'), card('J')],
      card('5', 'diamonds'),
    ],
    ['eight_ball', [card('8'), card('8', 'hearts'), card('A'), card('K')], card('2')],
    ['jackpot', [card('J'), card('2'), card('4'), card('6')], card('9')],
    ['jack_of_trades', [card('J'), card('J', 'hearts'), card('Q'), card('K')], card('2')],
    ['queens_court', [card('Q'), card('J'), card('2'), card('5')], card('8')],
    ['royal_flush', [card('Q'), card('2'), card('4'), card('6')], card('9', 'hearts')],
    ['crown_jewels', [card('K'), card('Q'), card('J'), card('10')], card('2', 'hearts')],
  ] as Array<[CardImprovementId, Card[], Card]>)(
    '%s scores once in a qualifying show',
    (id, hand, starter) => {
      expect(bonus(hand, starter, id)).toBe(2);
    },
  );

  it('does not score show bonuses merely because the starter is improved', () => {
    const starter = card('8');
    const hand = [card('8', 'hearts'), card('A'), card('K'), card('2')];
    expect(scoreHand(hand, starter, false, { [starter.id]: 'eight_ball' }).total).toBe(
      scoreHand(hand, starter).total,
    );
  });

  it('scores each improved card once, even with multiple pairs or multiple qualifying conditions', () => {
    const hand = [card('8'), card('8', 'hearts'), card('K'), card('K', 'hearts')];
    const starter = card('K', 'clubs');
    const improvements = {
      [hand[0].id]: 'eight_ball' as const,
      [hand[1].id]: 'eight_ball' as const,
    };
    expect(
      scoreHand(hand, starter, false, improvements).total - scoreHand(hand, starter).total,
    ).toBe(4);
    const royal = [card('K'), card('Q'), card('J'), card('10')];
    expect(bonus(royal, card('9'), 'crown_jewels')).toBe(2);
  });

  it('requires the right qualifying features, including crib flush rules', () => {
    expect(bonus([card('3'), card('4'), card('5'), card('6')], card('7'), 'third_wheel')).toBe(0);
    expect(bonus([card('8'), card('A'), card('4'), card('K')], card('2'), 'eight_ball')).toBe(0);
    expect(
      bonus([card('J'), card('2'), card('4'), card('6')], card('9', 'hearts'), 'jackpot'),
    ).toBe(0);
    expect(
      bonus([card('J'), card('J', 'hearts'), card('3'), card('6')], card('9'), 'jack_of_trades'),
    ).toBe(0);
    expect(bonus([card('Q'), card('2'), card('4'), card('6')], card('9'), 'queens_court')).toBe(0);
    expect(
      bonus([card('Q'), card('2'), card('4'), card('6')], card('9', 'hearts'), 'royal_flush', true),
    ).toBe(0);
    expect(
      bonus([card('K'), card('Q', 'hearts'), card('J'), card('2')], card('9'), 'crown_jewels'),
    ).toBe(0);
  });

  it('uses the base score rather than improvement bonus points for Five Alive', () => {
    const hand = [card('5'), card('2'), card('3', 'hearts'), card('8', 'clubs')];
    const starter = card('9', 'diamonds');
    const improvements = {
      [hand[0].id]: 'five_alive' as const,
      [hand[1].id]: 'best_hand_ever' as const,
    };
    expect(
      scoreHand(hand, starter, false, improvements).breakdown.some((item) =>
        item.description.includes('Five Alive'),
      ),
    ).toBe(false);
  });
});
