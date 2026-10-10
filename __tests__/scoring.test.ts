import { Card } from '../src/game/cards';
import { scoreHand, scorePegging } from '../src/game/scoring';

function makeCard(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

describe('scoreHand', () => {
  it('scores a flush of 4', () => {
    const hand = [
      makeCard('5', 'hearts'),
      makeCard('6', 'hearts'),
      makeCard('7', 'hearts'),
      makeCard('8', 'hearts'),
    ];
    const starter = makeCard('9', 'spades');
    const result = scoreHand(hand, starter);
    // run of 5 = 5, flush of 4 = 4, fifteen: 5+6+4? various
    // just check flush is counted
    const flushItem = result.breakdown.find((b) => b.description.includes('Flush'));
    expect(flushItem).toBeDefined();
    expect(flushItem!.points).toBe(4);
  });

  it('scores a flush of 5 when starter matches', () => {
    const hand = [
      makeCard('5', 'hearts'),
      makeCard('6', 'hearts'),
      makeCard('7', 'hearts'),
      makeCard('8', 'hearts'),
    ];
    const starter = makeCard('9', 'hearts');
    const result = scoreHand(hand, starter);
    const flushItem = result.breakdown.find((b) => b.description.includes('Flush'));
    expect(flushItem).toBeDefined();
    expect(flushItem!.points).toBe(5);
  });

  it('scores pairs', () => {
    const hand = [
      makeCard('5', 'hearts'),
      makeCard('5', 'clubs'),
      makeCard('7', 'hearts'),
      makeCard('8', 'hearts'),
    ];
    const starter = makeCard('9', 'spades');
    const result = scoreHand(hand, starter);
    const pairsItem = result.breakdown.find((b) => b.description.includes('Pairs'));
    expect(pairsItem).toBeDefined();
    expect(pairsItem!.points).toBe(2);
  });

  it('scores a run of 3', () => {
    const hand = [
      makeCard('4', 'spades'),
      makeCard('5', 'hearts'),
      makeCard('6', 'clubs'),
      makeCard('K', 'diamonds'),
    ];
    const starter = makeCard('2', 'spades');
    const result = scoreHand(hand, starter);
    const runItem = result.breakdown.find((b) => b.description.includes('Run'));
    expect(runItem).toBeDefined();
    expect(runItem!.points).toBe(3);
  });

  it('scores fifteens', () => {
    const hand = [
      makeCard('5', 'spades'),
      makeCard('5', 'hearts'),
      makeCard('5', 'clubs'),
      makeCard('J', 'diamonds'),
    ];
    const starter = makeCard('5', 'diamonds');
    const result = scoreHand(hand, starter);
    // 4 fives + jack: many fifteens
    expect(result.total).toBeGreaterThan(0);
  });

  it('scores nobs', () => {
    const hand = [
      makeCard('J', 'hearts'),
      makeCard('2', 'clubs'),
      makeCard('3', 'spades'),
      makeCard('4', 'diamonds'),
    ];
    const starter = makeCard('7', 'hearts');
    const result = scoreHand(hand, starter);
    const nobsItem = result.breakdown.find((b) => b.description.includes('nobs'));
    expect(nobsItem).toBeDefined();
  });
});

describe('scorePegging', () => {
  it('scores a fifteen', () => {
    const pile: Card[] = [makeCard('8', 'hearts'), makeCard('7', 'spades')];
    const result = scorePegging(pile, makeCard('7', 'spades'));
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it('scores 31', () => {
    const pile: Card[] = [
      makeCard('10', 'spades'),
      makeCard('10', 'hearts'),
      makeCard('A', 'clubs'), // 10+10+1 = 21 ... try different combo
    ];
    // 10 + A = 11, then 10 + 10 = 31 is not possible with face cards
    // Use: 7 + 8 + 6 + 10 = 31
    const pile2: Card[] = [
      makeCard('7', 'spades'),
      makeCard('8', 'hearts'),
      makeCard('6', 'clubs'),
      makeCard('10', 'diamonds'),
    ];
    const result = scorePegging(pile2, makeCard('10', 'diamonds'));
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it('scores a pair', () => {
    const pile: Card[] = [makeCard('6', 'hearts'), makeCard('6', 'spades')];
    const result = scorePegging(pile, makeCard('6', 'spades'));
    expect(result.details.some((d) => d.includes('Pair'))).toBe(true);
  });

  it('scores the improved Ace high in runs and applies counting bonuses', () => {
    const highAceRun = scoreHand(
      [makeCard('K'), makeCard('A'), makeCard('Q'), makeCard('5')],
      makeCard('2', 'hearts'),
      false,
      { 'A-spades': 'round_robin' },
    );
    expect(highAceRun.breakdown.some((item) => item.description.includes('Runs (3 pts)'))).toBe(
      true,
    );

    const lowAceRun = scoreHand(
      [makeCard('A'), makeCard('2', 'hearts'), makeCard('3', 'clubs'), makeCard('K')],
      makeCard('9', 'hearts'),
      false,
      { 'A-spades': 'round_robin' },
    );
    expect(lowAceRun.breakdown.some((item) => item.description.includes('Runs (3 pts)'))).toBe(
      true,
    );

    const improvedFours = scoreHand(
      [makeCard('4'), makeCard('5', 'hearts'), makeCard('6', 'clubs'), makeCard('7', 'diamonds')],
      makeCard('K', 'hearts'),
      false,
      { '4-spades': 'four_on_the_floor' },
    );
    expect(improvedFours.total).toBe(12);
    expect(
      improvedFours.breakdown.some((item) => item.description.includes('Four on the Floor')),
    ).toBe(true);
  });

  it('applies card-value and partner bonuses while counting hands', () => {
    const hand = scoreHand(
      [makeCard('2'), makeCard('5', 'hearts'), makeCard('6', 'clubs'), makeCard('9', 'diamonds')],
      makeCard('10', 'hearts'),
      false,
      {
        '2-spades': 'times_two',
        '6-clubs': 'call_my_number',
        '9-diamonds': 'best_hand',
      },
    );
    expect(hand.breakdown.some((item) => item.description.includes('fifteen'))).toBe(true);
    expect(hand.breakdown.some((item) => item.description.includes('sixteen'))).toBe(true);
    expect(hand.breakdown.some((item) => item.description.includes('Card improvements'))).toBe(
      true,
    );

    const pairBonus = scoreHand(
      [makeCard('2'), makeCard('9', 'hearts'), makeCard('6', 'clubs'), makeCard('7', 'diamonds')],
      makeCard('K', 'hearts'),
      false,
      { '2-spades': 'best_hand_ever', '6-clubs': 'gen_z', '7-diamonds': 'kids_these_days' },
    );
    const bonus = pairBonus.breakdown.find((item) =>
      item.description.includes('Card improvements'),
    );
    expect(bonus?.points).toBe(6);
  });

  it('applies pegging-only improvement scoring', () => {
    const doubled = scorePegging(
      [makeCard('8'), makeCard('5', 'hearts'), makeCard('2', 'clubs')],
      makeCard('2', 'clubs'),
      { '2-clubs': 'times_two' },
    );
    expect(doubled.total).toBe(4);

    const sixteen = scorePegging(
      [makeCard('10'), makeCard('6', 'hearts')],
      makeCard('6', 'hearts'),
      { '6-hearts': 'call_my_number' },
    );
    expect(sixteen.total).toBe(2);

    const fourCardRun = scorePegging(
      [makeCard('4'), makeCard('5', 'hearts'), makeCard('6', 'clubs'), makeCard('7', 'diamonds')],
      makeCard('7', 'diamonds'),
      { '4-spades': 'four_on_the_floor' },
    );
    expect(fourCardRun.total).toBe(8);
  });
});
