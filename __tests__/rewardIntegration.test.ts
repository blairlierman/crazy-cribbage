import { Card } from '../src/game/cards';
import {
  awardGo,
  createInitialGameState,
  dealHands,
  playerPlayCard,
  scoreShow,
} from '../src/game/gameState';
import {
  awardGoTwoHands,
  createInitialTwoHandGameState,
  dealTwoHands,
  playPeggingCard,
  scoreTwoHandShow,
} from '../src/game/twoHandState';
import { WHEEL_EFFECTS } from '../src/game/abilityScoring';
import { scoreHand } from '../src/game/scoring';

const card = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({
  rank,
  suit,
  id: `${rank}-${suit}`,
});

describe('reward integration', () => {
  it('lets either controlled seat choose a Crazy Eight value, rejecting invalid values', () => {
    const eight = card('8');
    const improvements = { [eight.id]: 'crazy_eight' as const };
    const classic = createInitialGameState({}, 121, 'player', improvements);
    classic.pegging.playerCards = [eight];
    expect(playerPlayCard(classic, eight, 1).pegging.count).toBe(1);
    expect(playerPlayCard(classic, eight, 8).pegging.count).toBe(8);
    expect(playerPlayCard(classic, eight, 11)).toBe(classic);

    const twin = createInitialTwoHandGameState({}, 100, 'tavern_table', 3, improvements);
    twin.pegging.topCards = [eight];
    expect(playPeggingCard(twin, 'top', eight, 1).pegging.count).toBe(1);
    expect(playPeggingCard(twin, 'top', eight, 8).pegging.count).toBe(8);
    expect(playPeggingCard(twin, 'top', eight, 11)).toBe(twin);
  });

  it('applies Last Word, First Blood and Tenacious to go only for the player', () => {
    const ten = card('10');
    const improvements = { [ten.id]: 'tenacious' as const };
    const state = createInitialGameState(
      { last_word: 1, first_blood: 1, go_bonus: 1 },
      121,
      'player',
      improvements,
    );
    state.pegging.pile = [ten];
    state.pegging.count = 10;
    const after = awardGo(state, 'player');
    expect(after.player.score).toBe(7);
    expect(awardGo(after, 'player').player.score).toBe(12);
    expect(awardGo(state, 'ai').ai.score).toBe(3);
  });

  it('tracks First Blood separately for each Twin Hands seat', () => {
    const state = createInitialTwoHandGameState(
      { first_blood: 1, last_word: 1 },
      100,
      'tavern_table',
      3,
    );
    const topGo = awardGoTwoHands(state, 'top');
    const bottomGo = awardGoTwoHands(topGo, 'bottom');
    expect(topGo.top.score).toBe(4);
    expect(bottomGo.bottom.score).toBe(4);
    expect(awardGoTwoHands(bottomGo, 'top').top.score).toBe(6);
  });

  it('applies pegging abilities at the actual play, once per hand and seat', () => {
    const five = card('5');
    const ten = card('10', 'hearts');
    const classic = createInitialGameState({ first_blood: 1 }, 121);
    classic.pegging.pile = [ten];
    classic.pegging.pileValues = [10];
    classic.pegging.count = 10;
    classic.pegging.playerCards = [five];
    const scored = playerPlayCard(classic, five);
    expect(scored.player.score).toBe(4);
    expect(scored.playerPeggingScored).toBe(true);
    expect(awardGo(scored, 'player').player.score).toBe(5);

    const twin = createInitialTwoHandGameState({ first_blood: 1 }, 100, 'tavern_table', 3);
    twin.pegging.pile = [ten];
    twin.pegging.pileValues = [10];
    twin.pegging.count = 10;
    twin.pegging.topCards = [five];
    const twinScored = playPeggingCard(twin, 'top', five);
    expect(twinScored.top.score).toBe(4);
    expect(twinScored.peggingScored).toEqual({ top: true, bottom: false });
    expect(awardGoTwoHands(twinScored, 'bottom').bottom.score).toBe(3);
  });

  it('awards 777 and Thirty-One Club for a pegged triplet reaching 31', () => {
    const cards = [card('10'), card('10', 'hearts'), card('10', 'clubs')];
    const state = createInitialGameState({ '777': 1, thirty_one_club: 1 }, 121);
    state.pegging.pile = [card('A'), cards[0], cards[1]];
    state.pegging.pileValues = [1, 10, 10];
    state.pegging.count = 21;
    state.pegging.playerCards = [cards[2]];
    const result = playerPlayCard(state, cards[2]);
    expect(result.player.score).toBe(11);
    expect(result.pegging.count).toBe(0);
    expect(result.peggingLog.join(' ')).toContain('777');
  });

  it('applies show abilities and the wheel only to controlled hands and owned cribs', () => {
    const hand = [card('2'), card('2', 'hearts'), card('4'), card('K', 'hearts')];
    const starter = card('9', 'clubs');
    const crib = [card('A'), card('3', 'hearts'), card('6', 'clubs'), card('Q', 'diamonds')];
    const abilities = { pair_specialist: 1, crib_builder: 1, wheel_of_fortune: 1 };
    const classic = createInitialGameState(abilities, 999, 'ai');
    classic.player.hand = hand;
    classic.ai.hand = hand;
    classic.crib = crib;
    classic.starter = starter;
    classic.wheelEffect = WHEEL_EFFECTS[0];
    const result = scoreShow(classic).handResult!;
    const handBase = scoreHand(hand, starter).total;
    expect(result.playerHand).toBe(handBase + 3);
    expect(result.aiHand).toBe(handBase);
    expect(result.crib).toBe(scoreHand(crib, starter, true).total);
    expect(result.playerHandBreakdown.join(' ')).toContain('Good Fortune');

    const twin = createInitialTwoHandGameState(abilities, 999, 'tavern_table', 3);
    twin.top.hand = hand;
    twin.bottom.hand = hand;
    twin.crib = crib;
    twin.starter = starter;
    twin.wheelEffect = WHEEL_EFFECTS[0];
    const twinResult = scoreTwoHandShow(twin).handResult!;
    expect(twinResult.topHand).toBe(handBase + 3);
    expect(twinResult.bottomHand).toBe(handBase + 3);
    expect(twinResult.crib).toBe(scoreHand(crib, starter, true).total + 2);
  });

  it('rolls a fresh wheel effect each deal only while the ability is unlocked', () => {
    const random = jest.spyOn(Math, 'random');
    try {
      random.mockReturnValue(0);
      const classic = dealHands(createInitialGameState({ wheel_of_fortune: 1 }, 121));
      expect(classic.wheelEffect).toEqual(WHEEL_EFFECTS[0]);
      random.mockReturnValue(0.99);
      expect(dealHands(classic).wheelEffect).toEqual(WHEEL_EFFECTS[WHEEL_EFFECTS.length - 1]);
      expect(dealHands(createInitialGameState({}, 121)).wheelEffect).toBeNull();
      expect(
        dealTwoHands(createInitialTwoHandGameState({ wheel_of_fortune: 1 }, 100, 'tavern_table', 3))
          .wheelEffect,
      ).toEqual(WHEEL_EFFECTS[WHEEL_EFFECTS.length - 1]);
    } finally {
      random.mockRestore();
    }
  });
});
