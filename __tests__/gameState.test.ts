import { Card } from '../src/game/cards';
import {
  awardGo,
  createInitialGameState,
  playerPass,
  playerPlayCard,
  resetPeggingPile,
  scoreShow,
  GameState,
  PeggingState,
} from '../src/game/gameState';

function makeCard(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

/** Build a minimal GameState wired up for pegging tests. */
function makePeggingState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialGameState({}, 121, 'player');

  const playerHand = [
    makeCard('5', 'hearts'),
    makeCard('6', 'clubs'),
    makeCard('7', 'diamonds'),
    makeCard('8', 'spades'),
  ];
  const aiHand = [
    makeCard('2', 'hearts'),
    makeCard('3', 'clubs'),
    makeCard('4', 'diamonds'),
    makeCard('9', 'spades'),
  ];

  const state: GameState = {
    ...base,
    phase: 'pegging',
    player: { hand: playerHand, discards: [], score: 0 },
    ai: { hand: aiHand, discards: [], score: 0 },
    starter: makeCard('K', 'hearts'),
    crib: [
      makeCard('A', 'spades'),
      makeCard('A', 'clubs'),
      makeCard('2', 'spades'),
      makeCard('2', 'clubs'),
    ],
    pegging: {
      pile: [],
      playedCards: [],
      count: 0,
      playerPassed: false,
      aiPassed: false,
      playerCards: [...playerHand],
      aiCards: [...aiHand],
      lastToPlay: 'player', // dealer = player, so AI (pone) leads — but for these tests we override as needed
      pileResetCount: 0,
    },
    ...overrides,
  };
  return state;
}

// ─── Pegging hand removal ─────────────────────────────────────────────────────

describe('pegging hand removal', () => {
  it('removes the played card from playerCards', () => {
    const state = makePeggingState({
      pegging: {
        pile: [],
        playedCards: [],
        count: 0,
        playerPassed: false,
        aiPassed: false,
        playerCards: [makeCard('5', 'hearts'), makeCard('6', 'clubs')],
        aiCards: [makeCard('2', 'hearts')],
        lastToPlay: 'ai',
        pileResetCount: 0,
      },
    });

    const card = makeCard('5', 'hearts');
    const next = playerPlayCard(state, card);

    expect(next.pegging.playerCards).toHaveLength(1);
    expect(next.pegging.playerCards.every((c) => c.id !== card.id)).toBe(true);
  });

  it('adds the played card to the pile with correct playedBy', () => {
    const state = makePeggingState({
      pegging: {
        pile: [],
        playedCards: [],
        count: 0,
        playerPassed: false,
        aiPassed: false,
        playerCards: [makeCard('5', 'hearts'), makeCard('6', 'clubs')],
        aiCards: [makeCard('2', 'hearts')],
        lastToPlay: 'ai',
        pileResetCount: 0,
      },
    });

    const card = makeCard('5', 'hearts');
    const next = playerPlayCard(state, card);

    expect(next.pegging.pile).toHaveLength(1);
    expect(next.pegging.pile[0].id).toBe(card.id);
    expect(next.pegging.playedCards).toHaveLength(1);
    expect(next.pegging.playedCards[0]).toEqual({ card, playedBy: 'player' });
  });

  it('does not allow playing a card that would exceed 31', () => {
    const tenCard = makeCard('10', 'hearts');
    const state = makePeggingState({
      pegging: {
        pile: [makeCard('10', 'spades'), makeCard('10', 'clubs'), makeCard('K', 'diamonds')], // count = 30
        playedCards: [],
        count: 30,
        playerPassed: false,
        aiPassed: false,
        playerCards: [tenCard],
        aiCards: [],
        lastToPlay: 'ai',
        pileResetCount: 0,
      },
    });

    const next = playerPlayCard(state, tenCard); // 30 + 10 = 40 > 31
    expect(next.pegging.pile).toHaveLength(3); // pile unchanged
    expect(next.pegging.playerCards).toHaveLength(1); // card still in hand
  });

  it('clears the current pile on 31 but preserves playedCards history', () => {
    const state = makePeggingState({
      pegging: {
        pile: [makeCard('10', 'spades'), makeCard('10', 'clubs')], // count = 20
        playedCards: [
          { card: makeCard('10', 'spades'), playedBy: 'ai' },
          { card: makeCard('10', 'clubs'), playedBy: 'player' },
        ],
        count: 20,
        playerPassed: false,
        aiPassed: false,
        playerCards: [makeCard('A', 'hearts')], // 20 + 1 = 21 — not 31
        aiCards: [],
        lastToPlay: 'ai',
        pileResetCount: 0,
      },
    });

    // Set up a real 31 scenario: count 21 + 10 = 31
    const stateFor31 = makePeggingState({
      pegging: {
        pile: [makeCard('10', 'spades'), makeCard('10', 'clubs'), makeCard('A', 'hearts')], // count = 21
        playedCards: [
          { card: makeCard('10', 'spades'), playedBy: 'ai' },
          { card: makeCard('10', 'clubs'), playedBy: 'player' },
          { card: makeCard('A', 'hearts'), playedBy: 'ai' },
        ],
        count: 21,
        playerPassed: false,
        aiPassed: false,
        playerCards: [makeCard('10', 'diamonds')], // 21 + 10 = 31
        aiCards: [],
        lastToPlay: 'ai',
        pileResetCount: 0,
      },
    });

    const next = playerPlayCard(stateFor31, makeCard('10', 'diamonds'));
    expect(next.pegging.count).toBe(0);
    expect(next.pegging.pile).toHaveLength(0);
    // playedCards accumulates all cards including the 31-hitting card
    expect(next.pegging.playedCards).toHaveLength(4);
  });
});

// ─── Go continuation ──────────────────────────────────────────────────────────

describe('go continuation', () => {
  it('resetPeggingPile increments pileResetCount so AI effect re-fires', () => {
    const state = makePeggingState();
    const afterGo = awardGo(state, 'player');
    const reset = resetPeggingPile(afterGo, 'player');
    expect(reset.pegging.pileResetCount).toBe(1);
    const reset2 = resetPeggingPile(reset, 'ai');
    expect(reset2.pegging.pileResetCount).toBe(2);
  });

  it('resetPeggingPile sets lastToPlay to the go recipient', () => {
    const state = makePeggingState();
    const afterGo = awardGo(state, 'ai');
    const reset = resetPeggingPile(afterGo, 'ai');

    // lastToPlay = 'ai' means player leads next (isPlayerTurn = lastToPlay !== 'player')
    expect(reset.pegging.lastToPlay).toBe('ai');
    expect(reset.pegging.count).toBe(0);
    expect(reset.pegging.pile).toHaveLength(0);
    expect(reset.pegging.playerPassed).toBe(false);
    expect(reset.pegging.aiPassed).toBe(false);
  });

  it('after player gets go, AI should lead next series (lastToPlay = player)', () => {
    const state = makePeggingState();
    const afterGo = awardGo(state, 'player');
    const reset = resetPeggingPile(afterGo, 'player');

    // lastToPlay = 'player' means AI leads next
    expect(reset.pegging.lastToPlay).toBe('player');
  });

  it('player score increases by 1 on go (standard)', () => {
    const state = makePeggingState();
    const after = awardGo(state, 'player');
    expect(after.player.score).toBe(1);
  });

  it('ai score increases by 1 on go (standard)', () => {
    const state = makePeggingState();
    const after = awardGo(state, 'ai');
    expect(after.ai.score).toBe(1);
  });

  it('playerPass marks playerPassed without changing lastToPlay', () => {
    const state = makePeggingState({
      pegging: {
        pile: [makeCard('5', 'hearts')],
        playedCards: [{ card: makeCard('5', 'hearts'), playedBy: 'player' }],
        count: 5,
        playerPassed: false,
        aiPassed: false,
        playerCards: [makeCard('6', 'clubs')],
        aiCards: [makeCard('K', 'spades')],
        lastToPlay: 'player',
        pileResetCount: 0,
      },
    });

    const after = playerPass(state);
    expect(after.pegging.playerPassed).toBe(true);
    expect(after.pegging.lastToPlay).toBe('player');
  });

  it('after go reset with goRecipient = ai, pile is empty and player can lead', () => {
    // Simulate: player played last (count 28), AI can't play, player can't play either
    const card5 = makeCard('5', 'hearts');
    const state = makePeggingState({
      player: { hand: [makeCard('5', 'hearts')], discards: [], score: 0 },
      pegging: {
        pile: [makeCard('10', 'spades'), makeCard('K', 'diamonds'), makeCard('8', 'clubs')], // count 28
        playedCards: [],
        count: 28,
        playerPassed: true,
        aiPassed: false,
        playerCards: [card5], // 5 > 31-28=3; can't play
        aiCards: [makeCard('4', 'hearts')], // 4 > 3; can't play
        lastToPlay: 'player',
        pileResetCount: 0,
      },
    });

    // Both passed; player gets go (player was last to play)
    let updated = awardGo(state, 'player');
    updated = resetPeggingPile(updated, 'player');

    // After go: pile cleared, player got the point
    expect(updated.player.score).toBe(1);
    expect(updated.pegging.count).toBe(0);
    expect(updated.pegging.pile).toHaveLength(0);
    // lastToPlay = 'player' → AI leads next new sub-game
    expect(updated.pegging.lastToPlay).toBe('player');
  });
});

// ─── Show phase: AI hand and crib revealed ────────────────────────────────────

describe('show phase reveals AI hand and crib', () => {
  it('scoreShow transitions to show phase', () => {
    const state = makePeggingState();
    const after = scoreShow(state);
    expect(['show', 'round_over']).toContain(after.phase);
  });

  it('ai.hand is preserved after scoreShow (for face-up display)', () => {
    const state = makePeggingState();
    const after = scoreShow(state);
    // AI hand should still contain the same cards (unchanged)
    expect(after.ai.hand).toHaveLength(state.ai.hand.length);
    expect(after.ai.hand.map((c) => c.id)).toEqual(
      state.ai.hand.map((c) => c.id)
    );
  });

  it('crib is preserved after scoreShow (for face-up display)', () => {
    const state = makePeggingState();
    const after = scoreShow(state);
    expect(after.crib).toHaveLength(4);
    expect(after.crib.map((c) => c.id)).toEqual(
      state.crib.map((c) => c.id)
    );
  });

  it('handResult is populated with aiHand score and crib score', () => {
    const state = makePeggingState();
    const after = scoreShow(state);
    expect(after.handResult).not.toBeNull();
    expect(typeof after.handResult!.aiHand).toBe('number');
    expect(typeof after.handResult!.crib).toBe('number');
    expect(after.handResult!.aiHandBreakdown).toBeDefined();
    expect(after.handResult!.cribBreakdown).toBeDefined();
  });

  it('dealer rotates after scoreShow', () => {
    const statePlayerDealer = makePeggingState();
    const after = scoreShow(statePlayerDealer);
    expect(after.dealer).toBe('ai');
  });

  it('scoreShow respects cribOwner = dealer', () => {
    const state = makePeggingState(); // dealer = 'player'
    const after = scoreShow(state);
    expect(after.handResult!.cribOwner).toBe('player');
  });

  it('winner is set when player score reaches target', () => {
    const state = makePeggingState({
      player: { hand: makePeggingState().player.hand, discards: [], score: 120 },
    });
    const after = scoreShow(state);
    // Player should win (120 + any hand score >= 121)
    if (after.player.score >= 121) {
      expect(after.winner).toBe('player');
    } else {
      expect(after.winner).toBeNull();
    }
  });
});
