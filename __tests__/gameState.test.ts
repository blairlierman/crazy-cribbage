import { Card } from '../src/game/cards';
import {
  awardGo,
  createInitialGameState,
  dealHands,
  playerPass,
  playerPlayCard,
  playerDiscard,
  playerSwap,
  resetPeggingPile,
  rerollStarter,
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

  it('scores non-dealer first and stops when non-dealer wins', () => {
    const state = makePeggingState({
      dealer: 'player',
      targetScore: 121,
      player: {
        hand: [
          makeCard('10', 'hearts'),
          makeCard('10', 'clubs'),
          makeCard('10', 'diamonds'),
          makeCard('10', 'spades'),
        ],
        discards: [],
        score: 120,
      },
      ai: {
        hand: [
          makeCard('A', 'hearts'),
          makeCard('A', 'clubs'),
          makeCard('4', 'diamonds'),
          makeCard('9', 'spades'),
        ],
        discards: [],
        score: 120,
      },
      starter: makeCard('K', 'hearts'),
      crib: [
        makeCard('5', 'hearts'),
        makeCard('5', 'clubs'),
        makeCard('5', 'diamonds'),
        makeCard('J', 'spades'),
      ],
    });

    const after = scoreShow(state);

    expect(after.winner).toBe('ai');
    expect(after.phase).toBe('round_over');
    expect(after.ai.score).toBeGreaterThan(120);
    expect(after.player.score).toBe(120);
    expect(after.handResult!.playerHand).toBe(0);
    expect(after.handResult!.crib).toBe(0);
  });
});

describe('deal/discard/swap/reroll behavior', () => {
  it('deals 6 cards each by default and enters discard phase', () => {
    const state = createInitialGameState({}, 121, 'player');
    const dealt = dealHands(state);
    expect(dealt.player.hand).toHaveLength(6);
    expect(dealt.ai.hand).toHaveLength(6);
    expect(dealt.phase).toBe('discard');
    expect(dealt.starter).toBeNull();
  });

  it('supports extra discard + peek starter + swap/lucky counters', () => {
    const state = createInitialGameState(
      { extra_discard: 1, peek_starter: 1, swap_one: 2, lucky_cut: 1 },
      121,
      'player'
    );
    const dealt = dealHands(state);
    expect(dealt.player.hand).toHaveLength(7);
    expect(dealt.ai.hand).toHaveLength(7);
    expect(dealt.phase).toBe('peek_starter');
    expect(dealt.starter).not.toBeNull();
    expect(dealt.swapsLeft).toBe(2);
    expect(dealt.luckyRerollAvailable).toBe(true);
  });

  it('ignores discard attempts with wrong card count', () => {
    const state = makePeggingState({
      phase: 'discard',
      abilities: {},
      player: {
        hand: [makeCard('A'), makeCard('2'), makeCard('3')],
        discards: [],
        score: 0,
      },
    });
    const same = playerDiscard(state, [makeCard('A')]);
    expect(same).toBe(state);
  });

  it('enters swap phase after valid discard when swap ability is present', () => {
    const state = makePeggingState({
      phase: 'discard',
      abilities: { swap_one: 1 },
      player: {
        hand: [
          makeCard('A', 'hearts'),
          makeCard('2', 'hearts'),
          makeCard('3', 'hearts'),
          makeCard('4', 'hearts'),
          makeCard('5', 'hearts'),
          makeCard('6', 'hearts'),
        ],
        discards: [],
        score: 0,
      },
      starter: makeCard('K', 'clubs'),
    });
    const discards = [makeCard('A', 'hearts'), makeCard('2', 'hearts')];
    const next = playerDiscard(state, discards);
    expect(next.phase).toBe('swap');
    expect(next.player.hand).toHaveLength(4);
  });

  it('playerSwap proceeds to pegging when no swap is performed', () => {
    const state = makePeggingState({
      phase: 'swap',
      swapsLeft: 0,
      starter: makeCard('Q', 'clubs'),
    });
    const next = playerSwap(state, null);
    expect(next.phase).toBe('pegging');
  });

  it('playerSwap replaces selected card, decrements swaps, and moves old card to deck', () => {
    const handCard = makeCard('5', 'hearts');
    const newDeckCard = makeCard('K', 'spades');
    const state = makePeggingState({
      phase: 'swap',
      swapsLeft: 1,
      starter: makeCard('Q', 'clubs'),
      player: {
        hand: [handCard, makeCard('6', 'clubs'), makeCard('7', 'diamonds'), makeCard('8', 'spades')],
        discards: [],
        score: 0,
      },
      deck: [newDeckCard, makeCard('9', 'clubs')],
    });

    const next = playerSwap(state, handCard);
    expect(next.swapsLeft).toBe(0);
    expect(next.player.hand.some((c) => c.id === newDeckCard.id)).toBe(true);
    expect(next.deck[next.deck.length - 1].id).toBe(handCard.id);
  });

  it('rerollStarter leaves state unchanged when unavailable and updates when available', () => {
    const base = makePeggingState({
      starter: makeCard('J', 'hearts'),
      deck: [makeCard('A', 'clubs'), makeCard('2', 'clubs')],
      luckyRerollAvailable: false,
    });
    const unchanged = rerollStarter(base);
    expect(unchanged).toBe(base);

    const available = { ...base, luckyRerollAvailable: true };
    const rerolled = rerollStarter(available);
    expect(rerolled.starter!.id).toBe('A-clubs');
    expect(rerolled.luckyRerollAvailable).toBe(false);
  });

  it('scoreShow returns unchanged state if starter is missing', () => {
    const state = makePeggingState({ starter: null });
    const same = scoreShow(state);
    expect(same).toBe(state);
  });
});

describe('awardGo winner branches', () => {
  it('ends round when player reaches target from go', () => {
    const state = makePeggingState({
      targetScore: 10,
      player: { ...makePeggingState().player, score: 9 },
    });
    const after = awardGo(state, 'player');
    expect(after.winner).toBe('player');
    expect(after.phase).toBe('round_over');
  });

  it('ends round when ai reaches target from go', () => {
    const state = makePeggingState({
      targetScore: 10,
      ai: { ...makePeggingState().ai, score: 9 },
    });
    const after = awardGo(state, 'ai');
    expect(after.winner).toBe('ai');
    expect(after.phase).toBe('round_over');
  });
});
