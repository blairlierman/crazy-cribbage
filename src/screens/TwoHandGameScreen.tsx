import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BoardView from '../components/BoardView';
import CardView from '../components/CardView';
import ScoreBoard from '../components/ScoreBoard';
import { UnlockedAbilities, hasAbility } from '../game/abilities';
import { BoardState } from '../game/boards';
import { Card, cardValue, sortCards } from '../game/cards';
import {
  awardGoTwoHands,
  canSeatPlay,
  createInitialTwoHandGameState,
  dealTwoHands,
  discardForSeat,
  getActivePeggingSeat,
  getDiscardCount,
  isTwoHandPeggingComplete,
  passPegging,
  playPeggingCard,
  rerollTwoHandStarter,
  resetTwoHandPegging,
  scoreTwoHandShow,
  swapForSeat,
  TwoHandGameState,
  TwoHandSeat,
} from '../game/twoHandState';
import { GameMode, RoundConfig } from '../game/modes';
import { RoundResult } from '../store/runState';

interface TwoHandGameScreenProps {
  abilities: UnlockedAbilities;
  roundIndex: number;
  round: RoundConfig;
  mode: GameMode;
  onRoundComplete: (result: RoundResult) => void;
}

export default function TwoHandGameScreen({
  abilities,
  roundIndex,
  round,
  mode,
  onRoundComplete,
}: TwoHandGameScreenProps) {
  const [game, setGame] = useState<TwoHandGameState>(() =>
    dealTwoHands(
      createInitialTwoHandGameState(
        abilities,
        round.targetScore,
        round.boardId!,
        round.handsLimit!,
      ),
    ),
  );
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [swapSelected, setSwapSelected] = useState<string | null>(null);
  const [handSortOrder, setHandSortOrder] = useState<'suit' | 'rank'>('suit');
  const [boardPreview, setBoardPreview] = useState<BoardState>(game.board);
  const [boardAnimating, setBoardAnimating] = useState(false);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const discardCount = getDiscardCount(game);
  const activePeggingSeat = game.phase === 'pegging' ? getActivePeggingSeat(game) : null;
  const topCards = useMemo(
    () =>
      sortCards(game.phase === 'pegging' ? game.pegging.topCards : game.top.hand, handSortOrder),
    [game, handSortOrder],
  );
  const bottomCards = useMemo(
    () =>
      sortCards(
        game.phase === 'pegging' ? game.pegging.bottomCards : game.bottom.hand,
        handSortOrder,
      ),
    [game, handSortOrder],
  );

  useEffect(() => {
    const handResult = game.handResult;
    if (!handResult) return;
    if (animationRef.current) clearTimeout(animationRef.current);

    const nextBoard: BoardState = {
      ...handResult.boardBefore,
      topPeg: { ...handResult.boardBefore.topPeg },
      bottomPeg: { ...handResult.boardBefore.bottomPeg },
      lastEffects: [],
    };
    setBoardPreview(nextBoard);
    setBoardAnimating(true);

    const targetTop = handResult.boardAfter.topPeg.position;
    const targetBottom = handResult.boardAfter.bottomPeg.position;
    let topPosition = handResult.boardBefore.topPeg.position;
    let bottomPosition = handResult.boardBefore.bottomPeg.position;

    const step = () => {
      if (topPosition < targetTop) {
        topPosition += 1;
        setBoardPreview((current) => ({
          ...current,
          topPeg: { ...current.topPeg, position: topPosition },
          totalProgress: topPosition + bottomPosition,
        }));
        animationRef.current = setTimeout(step, 50);
        return;
      }
      if (bottomPosition < targetBottom) {
        bottomPosition += 1;
        setBoardPreview((current) => ({
          ...current,
          bottomPeg: { ...current.bottomPeg, position: bottomPosition },
          totalProgress: topPosition + bottomPosition,
        }));
        animationRef.current = setTimeout(step, 50);
        return;
      }
      setBoardAnimating(false);
      setBoardPreview({
        ...handResult.boardAfter,
        topPeg: { ...handResult.boardAfter.topPeg },
        bottomPeg: { ...handResult.boardAfter.bottomPeg },
      });
    };

    animationRef.current = setTimeout(step, 150);

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [game.handResult]);

  useEffect(() => {
    if (game.phase !== 'pegging' || !isTwoHandPeggingComplete(game)) return;
    const withLastCard = awardGoTwoHands(game, game.pegging.lastToPlay ?? 'top');
    setGame(scoreTwoHandShow(withLastCard));
  }, [game]);

  const toggleSelectCard = (cardId: string) => {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= discardCount) return prev;
      return [...prev, cardId];
    });
  };

  const deal = () => {
    setGame((current) => dealTwoHands(current));
    setSelectedCards([]);
    setSwapSelected(null);
    setBoardPreview((current) => current);
  };

  const confirmDiscard = () => {
    const seat = game.discardSeat;
    const cards = game[seat].hand.filter((card) => selectedCards.includes(card.id));
    if (cards.length !== discardCount) return;
    setGame((current) => discardForSeat(current, seat, cards));
    setSelectedCards([]);
  };

  const confirmSwap = () => {
    if (!game.swapSeat) return;
    const seat = game.swapSeat;
    const card = game[seat].hand.find((item) => item.id === swapSelected) ?? null;
    setGame((current) => swapForSeat(current, seat, card));
    setSwapSelected(null);
  };

  const playCard = (seat: TwoHandSeat, card: Card) => {
    if (game.phase !== 'pegging' || activePeggingSeat !== seat) return;
    if (cardValue(card) + game.pegging.count > 31) return;
    setGame((current) => playPeggingCard(current, seat, card));
  };

  const handlePass = () => {
    if (game.phase !== 'pegging' || !activePeggingSeat) return;
    setGame((current) => {
      const otherSeat: TwoHandSeat = activePeggingSeat === 'top' ? 'bottom' : 'top';
      if (!canSeatPlay(current, otherSeat)) {
        const recipient = current.pegging.lastToPlay ?? otherSeat;
        return resetTwoHandPegging(awardGoTwoHands(current, recipient), recipient);
      }
      return passPegging(current, activePeggingSeat);
    });
  };

  const handleNext = () => {
    if (game.phase === 'round_over') {
      onRoundComplete({
        mode,
        roundIndex,
        targetScore: round.targetScore,
        playerWon: !!game.winner,
        playerFinalScore: game.board.totalProgress,
        opponentFinalScore: 0,
        boardId: round.boardId,
        handsUsed: game.handNumber,
        handsLimit: round.handsLimit,
        boardProgress: game.board.totalProgress,
      });
      return;
    }
    deal();
  };

  const renderSeat = (seat: TwoHandSeat, title: string, cards: Card[]) => {
    const isDiscardSeat = game.phase !== 'pegging' && game.discardSeat === seat;
    const isSwapSeat = game.phase === 'swap' && game.swapSeat === seat;
    const isActivePeggingSeat = activePeggingSeat === seat;
    const isDealer = game.dealer === seat;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>
            {title} {isDealer ? '👑' : ''}{' '}
            {game.phase === 'discard' || game.phase === 'peek_starter'
              ? isDiscardSeat
                ? `— discard ${discardCount}`
                : '— waiting'
              : game.phase === 'swap'
                ? isSwapSeat
                  ? '— swap or skip'
                  : '— ready'
                : game.phase === 'pegging'
                  ? isActivePeggingSeat
                    ? `— your turn (${game.pegging.count})`
                    : '— waiting'
                  : `— ${game[seat].score} pts`}
          </Text>
          <TouchableOpacity
            style={styles.sortToggle}
            onPress={() => setHandSortOrder((prev) => (prev === 'suit' ? 'rank' : 'suit'))}
          >
            <Text style={styles.sortToggleText}>{handSortOrder === 'suit' ? '♠️' : '🔢'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {cards.map((card) => (
            <CardView
              key={`${seat}-${card.id}`}
              card={card}
              selected={selectedCards.includes(card.id) || swapSelected === card.id}
              disabled={
                game.phase === 'discard' || game.phase === 'peek_starter'
                  ? game.discardSeat !== seat
                  : game.phase === 'swap'
                    ? game.swapSeat !== seat
                    : game.phase === 'pegging'
                      ? activePeggingSeat !== seat || cardValue(card) + game.pegging.count > 31
                      : true
              }
              onPress={
                game.phase === 'discard' || game.phase === 'peek_starter'
                  ? game.discardSeat === seat
                    ? () => toggleSelectCard(card.id)
                    : undefined
                  : game.phase === 'swap'
                    ? game.swapSeat === seat
                      ? () => setSwapSelected((prev) => (prev === card.id ? null : card.id))
                      : undefined
                    : game.phase === 'pegging'
                      ? activePeggingSeat === seat
                        ? () => playCard(seat, card)
                        : undefined
                      : undefined
              }
            />
          ))}
        </View>
        {game.handResult &&
        (game.phase === 'show' || game.phase === 'round_over') &&
        (seat === 'top'
          ? game.handResult.topHandBreakdown.length > 0
          : game.handResult.bottomHandBreakdown.length > 0) ? (
          <Text style={styles.handBreakdown}>
            {(seat === 'top'
              ? game.handResult.topHandBreakdown
              : game.handResult.bottomHandBreakdown
            ).join(', ')}
          </Text>
        ) : null}
      </View>
    );
  };

  const canPass =
    game.phase === 'pegging' &&
    !!activePeggingSeat &&
    !canSeatPlay(game, activePeggingSeat) &&
    (activePeggingSeat === 'top'
      ? game.pegging.topCards.length > 0
      : game.pegging.bottomCards.length > 0);

  return (
    <View style={styles.container}>
      <ScoreBoard
        playerScore={game.top.score}
        aiScore={game.bottom.score}
        targetScore={round.targetScore}
        roundIndex={roundIndex}
        abilities={abilities}
        leftLabel="Top Hand"
        rightLabel="Bottom Hand"
        modeLabel="Twin Hands"
        subLabel={`${game.board.totalProgress}/${round.targetScore} board progress • Hand ${game.handNumber}/${round.handsLimit}`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{game.handResult ? 'Board Progress' : 'Round Goal'}</Text>
          <Text style={styles.infoText}>
            Clear {round.targetScore} total progress on the {round.boardId?.replace(/_/g, ' ')}{' '}
            board within {round.handsLimit} hand{round.handsLimit === 1 ? '' : 's'}.
          </Text>
        </View>

        {renderSeat('top', 'Top Hand 🔵', topCards)}

        {(game.peggingLog.length > 0 || game.starter) && (
          <View style={styles.historyRow}>
            {game.peggingLog.length > 0 && (
              <View style={[styles.logBox, styles.logBoxFlex]}>
                {game.peggingLog.slice(-6).map((line, index) => (
                  <Text key={index} style={styles.logLine}>
                    {line}
                  </Text>
                ))}
              </View>
            )}

            {game.starter && (
              <View style={styles.starterPanel}>
                <Text style={styles.sectionLabel}>Starter</Text>
                <View style={styles.starterInlineRow}>
                  <CardView card={game.starter} small />
                  {game.luckyRerollAvailable && hasAbility(abilities, 'lucky_cut') && (
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => setGame((current) => rerollTwoHandStarter(current))}
                    >
                      <Text style={styles.smallBtnText}>🎲</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {game.phase === 'pegging' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Pegging Pile — Count {game.pegging.count} • Active:{' '}
              {activePeggingSeat === 'top' ? 'Top' : 'Bottom'}
            </Text>
            <View style={styles.row}>
              {game.pegging.pile.length === 0 ? (
                <Text style={styles.placeholderText}>Empty</Text>
              ) : (
                game.pegging.pile.map((card) => (
                  <CardView key={`pile-${card.id}-${game.pegging.count}`} card={card} small />
                ))
              )}
            </View>
          </View>
        )}

        {renderSeat('bottom', 'Bottom Hand 🟡', bottomCards)}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Crib {game.dealer === 'top' ? '(Top owns it)' : '(Bottom owns it)'}
          </Text>
          <View style={styles.row}>
            {game.crib.map((card) => (
              <CardView
                key={`crib-${card.id}`}
                card={card}
                small
                faceDown={
                  game.phase === 'discard' ||
                  game.phase === 'peek_starter' ||
                  game.phase === 'swap' ||
                  game.phase === 'pegging'
                }
              />
            ))}
          </View>
          {game.handResult?.cribBreakdown.length ? (
            <Text style={styles.handBreakdown}>{game.handResult.cribBreakdown.join(', ')}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {(game.phase === 'discard' || game.phase === 'peek_starter') && (
            <TouchableOpacity
              style={[styles.btn, selectedCards.length !== discardCount && styles.btnDisabled]}
              disabled={selectedCards.length !== discardCount}
              onPress={confirmDiscard}
            >
              <Text style={styles.btnText}>
                Confirm {game.discardSeat === 'top' ? 'Top' : 'Bottom'} discard (
                {selectedCards.length}/{discardCount})
              </Text>
            </TouchableOpacity>
          )}

          {game.phase === 'swap' && (
            <>
              <TouchableOpacity
                style={[styles.btn, !swapSelected && styles.btnDisabled]}
                disabled={!swapSelected}
                onPress={confirmSwap}
              >
                <Text style={styles.btnText}>
                  Swap {game.swapSeat === 'top' ? 'Top' : 'Bottom'} card
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setGame((current) => swapForSeat(current, current.swapSeat!, null))}
              >
                <Text style={styles.btnText}>Skip Swap</Text>
              </TouchableOpacity>
            </>
          )}

          {canPass && (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handlePass}>
              <Text style={styles.btnText}>Go!</Text>
            </TouchableOpacity>
          )}
        </View>

        {game.handResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>
              {boardAnimating ? 'Scoring Board...' : 'Hand Results'}
            </Text>
            <BoardView
              board={boardAnimating ? boardPreview : game.handResult.boardAfter}
              targetScore={round.targetScore}
            />
            {!boardAnimating && (
              <>
                <Text style={styles.resultLine}>Top hand: +{game.handResult.topTotal} pts</Text>
                <Text style={styles.resultLine}>
                  Bottom hand: +{game.handResult.bottomTotal} pts
                </Text>
                <Text style={styles.resultLine}>
                  Combined hand progress: +{game.handResult.combinedTotal}
                </Text>
                {game.phase === 'round_over' && (
                  <Text style={[styles.winnerText, game.winner ? styles.playerWon : styles.aiWon]}>
                    {game.winner
                      ? '🎉 Round cleared!'
                      : `💀 Out of hands. Finished at ${game.board.totalProgress}/${round.targetScore}.`}
                  </Text>
                )}
                <TouchableOpacity style={styles.btn} onPress={handleNext}>
                  <Text style={styles.btnText}>
                    {game.phase === 'round_over' ? 'Continue →' : 'Next Hand →'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  scroll: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoText: {
    color: '#E8F5E9',
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#A5D6A7',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  sortToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sortToggleText: {
    fontSize: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  logBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  logBoxFlex: {
    flex: 1,
  },
  logLine: {
    color: '#C8E6C9',
    fontSize: 12,
  },
  starterPanel: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallBtn: {
    backgroundColor: '#F57F17',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    margin: 4,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  btn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  btnSecondary: {
    backgroundColor: '#1565C0',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  resultBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
  },
  resultTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  resultLine: {
    color: '#E8F5E9',
    fontSize: 14,
  },
  handBreakdown: {
    color: '#A5D6A7',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  winnerText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 8,
  },
  playerWon: {
    color: '#66BB6A',
  },
  aiWon: {
    color: '#EF5350',
  },
});
