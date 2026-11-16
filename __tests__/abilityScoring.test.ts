import { ALL_ABILITIES, UnlockedAbilities } from '../src/game/abilities';
import {
  applyShowAbilityBonuses,
  getLastCardAbilityBonuses,
  getPeggingAbilityBonuses,
  rollWheelEffect,
  WHEEL_EFFECTS,
} from '../src/game/abilityScoring';
import { Card, Rank, Suit } from '../src/game/cards';
import { scoreHand, scorePegging } from '../src/game/scoring';

const card = (rank: Rank, suit: Suit): Card => ({ rank, suit, id: `${rank}-${suit}` });
const c = card;

describe('ability scoring', () => {
  it('registers each new ability for both game modes', () => {
    const ids = [
      'pair_specialist',
      'flush_fund',
      'noble_jack',
      'thirty_one_club',
      'first_blood',
      'last_word',
      'crib_builder',
      'safety_net',
      'double_trouble',
      'royal_treatment',
      '777',
      'wheel_of_fortune',
    ];
    for (const id of ids) {
      const matches = ALL_ABILITIES.filter((ability) => ability.id === id);
      expect(matches).toHaveLength(1);
      expect(matches[0].modes).toEqual(['classic', 'two_hands']);
    }
  });

  it('scores pairs, distinct pairs, and runs using the actual breakdown', () => {
    const hand = [c('3', 'clubs'), c('3', 'hearts'), c('4', 'clubs'), c('4', 'hearts')];
    const starter = c('5', 'spades');
    const base = scoreHand(hand, starter);
    const original = JSON.stringify(base);
    const result = applyShowAbilityBonuses(
      base,
      hand,
      starter,
      false,
      {
        pair_specialist: 1,
        double_trouble: 1,
        run_bonus: 2,
        double_fifteens: 1,
      },
      null,
    );
    const pairs = base.breakdown.find((entry) => entry.description.startsWith('Pairs'))!.points;
    const runs = base.breakdown.find((entry) => entry.description.startsWith('Runs'))!.points;
    const fifteens = base.breakdown.find((entry) => entry.description.includes('fifteen'))!.points;
    expect(result.total).toBe(base.total + pairs / 2 + 3 + runs * 2 + fifteens);
    expect(result.breakdown.reduce((sum, entry) => sum + entry.points, 0)).toBe(result.total);
    expect(JSON.stringify(base)).toBe(original);
  });

  it('requires an actual scoring flush and nobs, including crib flush rules', () => {
    const hand = [c('J', 'hearts'), c('2', 'hearts'), c('5', 'hearts'), c('7', 'hearts')];
    const starter = c('K', 'clubs');
    const abilities: UnlockedAbilities = { flush_fund: 1, noble_jack: 1 };
    const show = scoreHand(hand, starter);
    expect(applyShowAbilityBonuses(show, hand, starter, false, abilities, null).total).toBe(
      show.total + 2,
    );
    const crib = scoreHand(hand, starter, true);
    expect(applyShowAbilityBonuses(crib, hand, starter, true, abilities, null).total).toBe(
      crib.total,
    );
    const matched = c('K', 'hearts');
    const base = scoreHand(hand, matched, true);
    expect(applyShowAbilityBonuses(base, hand, matched, true, abilities, null).total).toBe(
      base.total + 4,
    );
  });

  it('checks safety against base score, excludes crib, and includes starter in royal treatment', () => {
    const hand = [c('J', 'clubs'), c('Q', 'hearts'), c('2', 'clubs'), c('4', 'hearts')];
    const starter = c('K', 'spades');
    const abilities: UnlockedAbilities = { safety_net: 1, crib_builder: 1, royal_treatment: 1 };
    const low = { total: 3, breakdown: [{ points: 3, description: 'Runs (3 pts)' }] };
    expect(applyShowAbilityBonuses(low, hand, starter, false, abilities, null).total).toBe(8);
    expect(applyShowAbilityBonuses(low, hand, starter, true, abilities, null).total).toBe(8);
    const four = { total: 4, breakdown: [{ points: 4, description: 'Runs (4 pts)' }] };
    expect(applyShowAbilityBonuses(four, hand, starter, false, abilities, null).total).toBe(7);
    expect(applyShowAbilityBonuses(low, hand, starter, false, null, null)).toEqual(low);
  });

  it('awards 777 for exact triplets, not four of a kind', () => {
    const starter = c('7', 'spades');
    const triple = [c('7', 'clubs'), c('7', 'hearts'), c('2', 'clubs'), c('4', 'hearts')];
    const four = [c('7', 'clubs'), c('7', 'hearts'), c('7', 'diamonds'), c('4', 'hearts')];
    for (const [hand, bonus] of [
      [triple, 1],
      [four, 0],
    ] as const) {
      const base = scoreHand(hand, starter);
      expect(applyShowAbilityBonuses(base, hand, starter, false, { '777': 1 }, null).total).toBe(
        base.total + bonus,
      );
    }
    const twoTriples = [
      c('7', 'clubs'),
      c('7', 'hearts'),
      c('7', 'diamonds'),
      c('2', 'clubs'),
      c('2', 'hearts'),
    ];
    const secondStarter = c('2', 'spades');
    const base = scoreHand(twoTriples, secondStarter);
    expect(
      applyShowAbilityBonuses(base, twoTriples, secondStarter, false, { '777': 1 }, null).total,
    ).toBe(base.total + 2);
  });

  it('rolls and applies one visible wheel effect to hands only, with a nonnegative total', () => {
    expect(rollWheelEffect(() => 0.99)).toEqual(WHEEL_EFFECTS[WHEEL_EFFECTS.length - 1]);
    const effect = WHEEL_EFFECTS[1];
    const hand = [c('2', 'clubs'), c('4', 'hearts'), c('6', 'clubs'), c('8', 'hearts')];
    const starter = c('K', 'spades');
    const zero = { total: 0, breakdown: [] };
    const abilities: UnlockedAbilities = { wheel_of_fortune: 1 };
    const result = applyShowAbilityBonuses(zero, hand, starter, false, abilities, effect);
    expect(result.total).toBe(0);
    expect(result.breakdown.some((entry) => entry.description.includes(effect.name))).toBe(true);
    expect(result.breakdown.reduce((sum, entry) => sum + entry.points, 0)).toBe(0);
    expect(applyShowAbilityBonuses(zero, hand, starter, true, abilities, effect)).toEqual(zero);
    expect(applyShowAbilityBonuses(zero, hand, starter, false, {}, effect)).toEqual(zero);
  });

  it('applies conditional wheel outcomes per pair or fifteen, capped at three', () => {
    const hand = [c('5', 'clubs'), c('5', 'hearts'), c('5', 'diamonds'), c('J', 'clubs')];
    const starter = c('5', 'spades');
    const base = scoreHand(hand, starter);
    const abilities: UnlockedAbilities = { wheel_of_fortune: 1 };
    for (const effect of WHEEL_EFFECTS.filter((item) => item.per)) {
      const result = applyShowAbilityBonuses(base, hand, starter, false, abilities, effect);
      expect(result.total).toBe(base.total + 3 * effect.points);
    }
  });

  it('awards first scoring, 31, exact pegging triplets, and last card independently', () => {
    const pile = [c('10', 'clubs'), c('10', 'hearts'), c('10', 'diamonds')];
    const abilities: UnlockedAbilities = {
      first_blood: 1,
      thirty_one_club: 1,
      '777': 1,
      last_word: 1,
    };
    const base = scorePegging(pile, pile[2]);
    expect(getPeggingAbilityBonuses(pile, 31, base, abilities, true).bonus).toBe(5);
    expect(getPeggingAbilityBonuses(pile, 30, base, abilities, false).bonus).toBe(1);
    const four = [...pile, c('10', 'spades')];
    expect(
      getPeggingAbilityBonuses(four, 30, scorePegging(four, four[3]), abilities, false).bonus,
    ).toBe(0);
    expect(
      getPeggingAbilityBonuses([pile[0]], 10, { total: 0, details: [] }, abilities, true).bonus,
    ).toBe(0);
    expect(getLastCardAbilityBonuses(abilities, true).bonus).toBe(3);
    expect(getLastCardAbilityBonuses(abilities, false).bonus).toBe(1);
    expect(getLastCardAbilityBonuses(null, true).bonus).toBe(0);
  });
});
