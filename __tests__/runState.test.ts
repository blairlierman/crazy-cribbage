import { advanceRound, createInitialRunState, currentRound } from '../src/store/runState';

describe('run state', () => {
  it('creates a classic run by default', () => {
    const run = createInitialRunState();
    expect(run.mode).toBe('classic');
    expect(currentRound(run).targetScore).toBe(31);
  });

  it('creates a twin hands run with board metadata', () => {
    const run = createInitialRunState('two_hands');
    const round = currentRound(run);
    expect(round.boardId).toBeTruthy();
    expect(round.handsLimit).toBeGreaterThan(0);
  });

  it('advances rounds and preserves mode', () => {
    const run = createInitialRunState('two_hands');
    const next = advanceRound(
      run,
      {
        mode: 'two_hands',
        roundIndex: 0,
        targetScore: 45,
        playerWon: true,
        playerFinalScore: 46,
        opponentFinalScore: 0,
        boardId: 'tavern_table',
        handsUsed: 2,
        handsLimit: 2,
        boardProgress: 46,
      },
      null,
    );
    expect(next.mode).toBe('two_hands');
    expect(next.currentRoundIndex).toBe(1);
  });
});
