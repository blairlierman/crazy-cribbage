import { Card } from '../src/game/cards';
import {
  awardGoTwoHands,
  createInitialTwoHandGameState,
  dealTwoHands,
  discardForSeat,
  getActivePeggingSeat,
  passPegging,
  playPeggingCard,
  resetTwoHandPegging,
  scoreTwoHandShow,
  TwoHandGameState,
} from '../src/game/twoHandState';

function makeCard(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

function makeState(overrides: Partial<TwoHandGameState> = {}): TwoHandGameState {
  const dealt = dealTwoHands(createInitialTwoHandGameState({}, 30, 'tavern_table', 2));
  return {
    ...dealt,
    top: {
      hand: [
        makeCard('5', 'hearts'),
        makeCard('6', 'hearts'),
        makeCard('7', 'hearts'),
        makeCard('8', 'hearts'),
        makeCard('9', 'clubs'),
        makeCard('K', 'clubs'),
      ],
      discards: [],
      score: 0,
    },
    bottom: {
      hand: [
        makeCard('2', 'clubs'),
        makeCard('3', 'clubs'),
        makeCard('4', 'clubs'),
        makeCard('5', 'clubs'),
        makeCard('Q', 'hearts'),
        makeCard('K', 'hearts'),
      ],
      discards: [],
      score: 0,
    },
    ...overrides,
  };
}

describe('two hand state', () => {
  it('requires both hands to discard before pegging starts', () => {
    const state = makeState({ phase: 'discard', discardSeat: 'top', crib: [] });
    const topDiscarded = discardForSeat(state, 'top', state.top.hand.slice(0, 2));
    expect(topDiscarded.discardSeat).toBe('bottom');
    expect(topDiscarded.phase).toBe('discard');

    const bothDiscarded = discardForSeat(
      topDiscarded,
      'bottom',
      topDiscarded.bottom.hand.slice(0, 2),
    );
    expect(['swap', 'pegging']).toContain(bothDiscarded.phase);
    expect(bothDiscarded.crib).toHaveLength(4);
  });

  it('alternates pegging turns between top and bottom hands', () => {
    const state = makeState({
      phase: 'pegging',
      pegging: {
        pile: [],
        playedCards: [],
        count: 0,
        topPassed: false,
        bottomPassed: false,
        topCards: [makeCard('5', 'hearts')],
        bottomCards: [makeCard('6', 'clubs')],
        lastToPlay: 'top',
        pileResetCount: 0,
      },
    });

    expect(getActivePeggingSeat(state)).toBe('bottom');
    const afterBottom = playPeggingCard(state, 'bottom', makeCard('6', 'clubs'));
    expect(afterBottom.pegging.lastToPlay).toBe('bottom');
    expect(getActivePeggingSeat(afterBottom)).toBe('top');
  });

  it('switches to the other hand after a go pass', () => {
    const state = makeState({
      phase: 'pegging',
      pegging: {
        pile: [makeCard('10', 'hearts'), makeCard('10', 'clubs')],
        playedCards: [
          { card: makeCard('10', 'hearts'), playedBy: 'top' },
          { card: makeCard('10', 'clubs'), playedBy: 'bottom' },
        ],
        count: 20,
        topPassed: false,
        bottomPassed: false,
        topCards: [makeCard('K', 'spades')],
        bottomCards: [makeCard('A', 'clubs')],
        lastToPlay: 'bottom',
        pileResetCount: 0,
      },
    });

    const afterPass = passPegging(state, 'top');

    expect(afterPass.pegging.topPassed).toBe(true);
    expect(afterPass.pegging.lastToPlay).toBe('top');
    expect(getActivePeggingSeat(afterPass)).toBe('bottom');
  });

  it('moves the combined board during pegging scores', () => {
    const state = makeState({
      phase: 'pegging',
      targetScore: 30,
      pegging: {
        pile: [makeCard('10', 'hearts')],
        playedCards: [{ card: makeCard('10', 'hearts'), playedBy: 'top' }],
        count: 10,
        topPassed: false,
        bottomPassed: false,
        topCards: [makeCard('6', 'clubs')],
        bottomCards: [makeCard('5', 'clubs')],
        lastToPlay: 'top',
        pileResetCount: 0,
      },
    });

    const next = playPeggingCard(state, 'bottom', makeCard('5', 'clubs'));
    expect(next.board.totalProgress).toBeGreaterThan(0);
  });

  it('scores show, updates the board, and can end the round', () => {
    const state = makeState({
      phase: 'pegging',
      handNumber: 2,
      handsLimit: 2,
      starter: makeCard('9', 'diamonds'),
      crib: [makeCard('A'), makeCard('A', 'clubs'), makeCard('2'), makeCard('2', 'clubs')],
      pegging: {
        pile: [],
        playedCards: [],
        count: 0,
        topPassed: false,
        bottomPassed: false,
        topCards: [],
        bottomCards: [],
        lastToPlay: 'bottom',
        pileResetCount: 0,
      },
      top: {
        hand: [
          makeCard('5', 'hearts'),
          makeCard('6', 'hearts'),
          makeCard('7', 'hearts'),
          makeCard('8', 'hearts'),
        ],
        discards: [],
        score: 10,
      },
      bottom: {
        hand: [
          makeCard('2', 'clubs'),
          makeCard('3', 'clubs'),
          makeCard('4', 'clubs'),
          makeCard('5', 'clubs'),
        ],
        discards: [],
        score: 8,
      },
      handStartScores: { top: 0, bottom: 0 },
      targetScore: 10,
    });

    const afterGo = awardGoTwoHands(state, 'bottom');
    const after = scoreTwoHandShow(resetTwoHandPegging(afterGo, 'bottom'));
    expect(after.handResult).not.toBeNull();
    expect(after.board.totalProgress).toBeGreaterThan(0);
    expect(after.phase).toBe('round_over');
  });

  it('scores all cards in an expanded crib', () => {
    const state = makeState({
      phase: 'show',
      starter: makeCard('9', 'diamonds'),
      crib: [
        makeCard('A'),
        makeCard('A', 'clubs'),
        makeCard('2'),
        makeCard('2', 'clubs'),
        makeCard('A', 'diamonds'),
      ],
    });

    const after = scoreTwoHandShow(state);

    expect(after.handResult?.crib).toBe(14);
    expect(after.handResult?.cribBreakdown).toContain('Pairs (8 pts)');
  });
});
