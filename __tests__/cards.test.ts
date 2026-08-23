import {
  Card,
  cardOrder,
  cardValue,
  createDeck,
  rankDisplay,
  shuffle,
  sortCards,
  suitSymbol,
} from '../src/game/cards';

describe('cards helpers', () => {
  it('builds a standard 52-card deck with unique ids', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('returns value and order for face cards and aces', () => {
    expect(cardValue({ rank: 'K', suit: 'hearts', id: 'K-hearts' })).toBe(10);
    expect(cardValue({ rank: 'A', suit: 'clubs', id: 'A-clubs' })).toBe(1);
    expect(cardOrder({ rank: 'Q', suit: 'spades', id: 'Q-spades' })).toBe(12);
  });

  it('shuffles into a new array without changing card membership', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const deck = createDeck().slice(0, 5);
      const beforeIds = deck.map((c) => c.id);
      const shuffled = shuffle(deck);
      expect(shuffled).not.toBe(deck);
      expect(shuffled.map((c) => c.id).sort()).toEqual([...beforeIds].sort());
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('sorts cards by suit first, then rank', () => {
    const cards: Card[] = [
      { rank: 'K', suit: 'hearts', id: 'K-hearts' },
      { rank: 'A', suit: 'clubs', id: 'A-clubs' },
      { rank: '7', suit: 'spades', id: '7-spades' },
      { rank: '2', suit: 'clubs', id: '2-clubs' },
      { rank: 'Q', suit: 'diamonds', id: 'Q-diamonds' },
    ];

    expect(sortCards(cards).map((card) => card.id)).toEqual([
      'Q-diamonds',
      'A-clubs',
      '2-clubs',
      'K-hearts',
      '7-spades',
    ]);
  });

  it('sorts cards by rank first, then suit', () => {
    const cards: Card[] = [
      { rank: 'K', suit: 'hearts', id: 'K-hearts' },
      { rank: 'A', suit: 'clubs', id: 'A-clubs' },
      { rank: '7', suit: 'spades', id: '7-spades' },
      { rank: '2', suit: 'clubs', id: '2-clubs' },
      { rank: 'Q', suit: 'diamonds', id: 'Q-diamonds' },
    ];

    expect(sortCards(cards, 'rank').map((card) => card.id)).toEqual([
      'A-clubs',
      '2-clubs',
      '7-spades',
      'Q-diamonds',
      'K-hearts',
    ]);
  });

  it('returns suit symbols and rank display', () => {
    expect(suitSymbol('clubs')).toBe('♣');
    expect(suitSymbol('diamonds')).toBe('♦');
    expect(suitSymbol('hearts')).toBe('♥');
    expect(suitSymbol('spades')).toBe('♠');
    expect(rankDisplay('10')).toBe('10');
  });
});
