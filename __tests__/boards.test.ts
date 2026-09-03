import { applyBoardScore, createBoardState } from '../src/game/boards';

describe('board progression', () => {
  it('applies boosts and updates total progress', () => {
    const board = createBoardState('tavern_table');
    const result = applyBoardScore(board, 'topPeg', 4);
    expect(result.board.topPeg.position).toBeGreaterThan(4);
    expect(result.board.totalProgress).toBe(result.board.topPeg.position);
  });

  it('uses safe charges to block setbacks', () => {
    const first = applyBoardScore(createBoardState('tavern_table'), 'topPeg', 9).board;
    expect(first.topPeg.safeCharges).toBeGreaterThan(0);

    const second = applyBoardScore(first, 'topPeg', 3);
    expect(second.effects.some((line) => line.includes('shielded'))).toBe(true);
  });
});
