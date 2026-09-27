import { applyBoardScore, createBoardState } from '../src/game/boards';
import { getModeConfig } from '../src/game/modes';
import { getBoardDefinition } from '../src/game/boards';

describe('board progression', () => {
  it('applies boosts and updates total progress', () => {
    const board = createBoardState('tavern_table');
    const result = applyBoardScore(board, 4);
    expect(result.board.peg.position).toBeGreaterThan(4);
    expect(result.board.totalProgress).toBe(result.board.peg.position);
  });

  it('uses safe charges to block setbacks', () => {
    const first = applyBoardScore(createBoardState('tavern_table'), 9).board;
    expect(first.peg.safeCharges).toBeGreaterThan(0);

    const second = applyBoardScore(first, 3);
    expect(second.effects.some((line) => line.includes('shielded'))).toBe(true);
  });

  it('provides enough holes for each Twin Hands round target', () => {
    const rounds = getModeConfig('two_hands').rounds;

    for (const round of rounds) {
      const board = getBoardDefinition(round.boardId!);
      expect(board.trackLength).toBeGreaterThanOrEqual(round.targetScore);
    }
  });
});
