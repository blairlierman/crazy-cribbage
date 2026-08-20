import {
  ALL_ABILITIES,
  abilityStacks,
  getAbility,
  hasAbility,
  rollAbilityChoices,
  UnlockedAbilities,
} from '../src/game/abilities';

describe('abilities helpers', () => {
  it('returns ability metadata by id', () => {
    const ability = getAbility('extra_discard');
    expect(ability.name).toBe('Extra Discard');
  });

  it('returns 0 stacks for missing or undefined ability maps', () => {
    expect(abilityStacks(undefined, 'go_bonus')).toBe(0);
    expect(abilityStacks(null, 'go_bonus')).toBe(0);
    expect(abilityStacks({}, 'go_bonus')).toBe(0);
  });

  it('detects whether an ability is unlocked', () => {
    const abilities: UnlockedAbilities = { go_bonus: 1 };
    expect(hasAbility(abilities, 'go_bonus')).toBe(true);
    expect(hasAbility(abilities, 'peek_starter')).toBe(false);
  });

  it('rolls only abilities below max stacks', () => {
    const current: UnlockedAbilities = {};
    for (const ability of ALL_ABILITIES) {
      current[ability.id] = ability.maxStacks;
    }
    current.swap_one = 1; // leave one ability available

    const choices = rollAbilityChoices(current, 3);
    expect(choices).toHaveLength(1);
    expect(choices[0].id).toBe('swap_one');
  });

  it('honors requested count and random selection path', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.42);
    try {
      const choices = rollAbilityChoices({}, 3);
      expect(choices).toHaveLength(3);
      expect(new Set(choices.map((c) => c.id)).size).toBe(3);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
