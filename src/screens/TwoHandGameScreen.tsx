import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BoardView from '../components/BoardView';
import CardView from '../components/CardView';
import { ALL_ABILITIES, UnlockedAbilities, hasAbility } from '../game/abilities';
import { BoardState } from '../game/boards';
import { Card, cardValue, sortCards } from '../game/cards';
import { GameMode, RoundConfig } from '../game/modes';
import {
  TwoHandGameState,
  TwoHandSeat,
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
} from '../game/twoHandState';
import { RoundResult } from '../store/runState';

interface TwoHandGameScreenProps {
  abilities: UnlockedAbilities;
  roundIndex: number;
  round: RoundConfig;
  mode: GameMode;
  onRoundComplete: (result: RoundResult) => void;
}

interface AbilityTooltipState {
  name: string;
  description: string;
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
  const [boardPreview, setBoardPreview] = useState<BoardState>(() => cloneBoard(game.board));
  const [boardAnimating, setBoardAnimating] = useState(false);
  const [boardSpotlight, setBoardSpotlight] = useState(false);
  const [abilityTooltip, setAbilityTooltip] = useState<AbilityTooltipState | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotlightRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousBoardRef = useRef<BoardState>(cloneBoard(game.board));

  const discardCount = getDiscardCount(game);
  const activePeggingSeat = game.phase === 'pegging' ? getActivePeggingSeat(game) : null;
  const combinedScore = game.top.score + game.bottom.score;
  const handsLabel = `${game.handNumber}/${round.handsLimit}`;
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
  const abilityTokens = useMemo(
    () =>
      ALL_ABILITIES.flatMap((ability) =>
        Array.from({ length: abilities[ability.id] ?? 0 }, (_, index) => ({
          id: `${ability.id}-${index}`,
          name: ability.name,
          description: ability.description,
          emoji: ability.emoji,
        })),
      ),
    [abilities],
  );

  useEffect(() => {
    const previousBoard = previousBoardRef.current;
    const boardChanged =
      previousBoard.totalProgress !== game.board.totalProgress ||
      previousBoard.peg.position !== game.board.peg.position ||
      previousBoard.trailPosition !== game.board.trailPosition;

    previousBoardRef.current = cloneBoard(game.board);

    if (!boardChanged) {
      setBoardPreview(cloneBoard(game.board));
      return;
    }

    if (animationRef.current) clearTimeout(animationRef.current);
    if (spotlightRef.current) clearTimeout(spotlightRef.current);

    setBoardAnimating(true);
    setBoardSpotlight(true);
    setBoardPreview(cloneBoard(previousBoard));

    let currentPosition = previousBoard.peg.position;
    const targetPosition = game.board.peg.position;

    const step = () => {
      if (currentPosition === targetPosition) {
        setBoardPreview(cloneBoard(game.board));
        setBoardAnimating(false);
        spotlightRef.current = setTimeout(() => setBoardSpotlight(false), 1400);
        return;
      }

      const nextPosition = currentPosition + Math.sign(targetPosition - currentPosition);
      setBoardPreview((current) => ({
        ...current,
        trailPosition: currentPosition,
        peg: { ...current.peg, position: nextPosition },
        totalProgress: nextPosition,
      }));
      currentPosition = nextPosition;
      animationRef.current = setTimeout(step, 60);
    };

    animationRef.current = setTimeout(step, 120);

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [game.board]);

  useEffect(() => {
    if (game.phase !== 'pegging' || game.winner !== null || !isTwoHandPeggingComplete(game)) return;
    const withLastCard = awardGoTwoHands(game, game.pegging.lastToPlay ?? 'top');
    setGame(withLastCard.phase === 'round_over' ? withLastCard : scoreTwoHandShow(withLastCard));
  }, [game]);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
      if (spotlightRef.current) clearTimeout(spotlightRef.current);
    };
  }, []);

  const toggleSelectCard = (cardId: string) => {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= discardCount) return prev;
      return [...prev, cardId];
    });
  };

  const toggleSortOrder = () => {
    setHandSortOrder((prev) => (prev === 'suit' ? 'rank' : 'suit'));
  };

  const deal = () => {
    setGame((current) => dealTwoHands(current));
    setSelectedCards([]);
    setSwapSelected(null);
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
    if (game.phase !== 'pegging' || game.winner !== null || activePeggingSeat !== seat) return;
    if (cardValue(card) + game.pegging.count > 31) return;
    setGame((current) => playPeggingCard(current, seat, card));
  };

  const handlePass = () => {
    if (game.phase !== 'pegging' || game.winner !== null || !activePeggingSeat) return;
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
    const isDiscardSeat = game.discardSeat === seat;
    const isSwapSeat = game.swapSeat === seat;
    const isActiveSeat = activePeggingSeat === seat;
    const isDealer = game.dealer === seat;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>
            {title} {isDealer ? '👑' : ''}
            {game.phase === 'discard' || game.phase === 'peek_starter'
              ? isDiscardSeat
                ? ` — discard ${discardCount}`
                : ' — waiting'
              : game.phase === 'swap'
                ? isSwapSeat
                  ? ' — swap or skip'
                  : ' — ready'
                : game.phase === 'pegging'
                  ? isActiveSeat
                    ? ` — your turn (${game.pegging.count})`
                    : ' — waiting'
                  : ''}
          </Text>
          <TouchableOpacity style={styles.sortToggle} onPress={toggleSortOrder}>
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
    game.winner === null &&
    !!activePeggingSeat &&
    !canSeatPlay(game, activePeggingSeat) &&
    (activePeggingSeat === 'top'
      ? game.pegging.topCards.length > 0
      : game.pegging.bottomCards.length > 0);

  const shouldShowBoard =
    boardAnimating ||
    boardSpotlight ||
    game.phase === 'discard' ||
    game.phase === 'peek_starter' ||
    game.phase === 'swap' ||
    game.phase === 'show' ||
    game.phase === 'round_over';

  const displayedBoard = boardAnimating ? boardPreview : game.board;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.handsBadge}>
            <Text style={styles.handsBadgeLabel}>Hands</Text>
            <Text style={styles.handsBadgeValue}>{handsLabel}</Text>
          </View>

          <View style={styles.headerCenter}>
            <Text
              style={styles.roundLabel}
            >{`Twin Hands • Round ${roundIndex + 1} (to ${round.targetScore})`}</Text>
            <Text style={styles.subLabel}>
              {game.board.totalProgress}/{round.targetScore} board progress
            </Text>
          </View>

          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeLabel}>Combined</Text>
            <Text style={styles.scoreBadgeValue}>{combinedScore}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (combinedScore / round.targetScore) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressTarget}>/ {round.targetScore}</Text>
        </View>

        {abilityTokens.length > 0 && (
          <View style={styles.abilityRow}>
            {abilityTokens.map((token) => (
              <TouchableOpacity
                key={token.id}
                style={styles.abilityToken}
                onPress={() =>
                  setAbilityTooltip({ name: token.name, description: token.description })
                }
                onLongPress={() =>
                  setAbilityTooltip({ name: token.name, description: token.description })
                }
                accessibilityRole="button"
                accessibilityLabel={`${token.name}: ${token.description}`}
                accessibilityHint="Tap or long press to view ability description"
              >
                <Text style={styles.abilityEmoji}>{token.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {shouldShowBoard && (
          <View style={styles.boardWrapper}>
            <BoardView board={displayedBoard} targetScore={round.targetScore} />
          </View>
        )}

        {renderSeat('top', 'Top Hand 🔵', topCards)}

        <View style={styles.middleRow}>
          <View style={styles.starterPanel}>
            <Text style={styles.sectionLabel}>Starter</Text>
            <View style={styles.starterInlineRow}>
              {game.starter ? (
                <CardView card={game.starter} small />
              ) : (
                <View style={styles.starterPlaceholder}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}
              {game.luckyRerollAvailable && game.starter && hasAbility(abilities, 'lucky_cut') && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => setGame((current) => rerollTwoHandStarter(current))}
                >
                  <Text style={styles.smallBtnText}>🎲</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.cribPanel}>
            <Text style={styles.sectionLabel}>
              Crib {game.dealer === 'top' ? '(Top owns it)' : '(Bottom owns it)'}
            </Text>
            <View style={styles.row}>
              {game.crib.length === 0 ? (
                <Text style={styles.emptyPanelText}>Empty</Text>
              ) : (
                game.crib.map((card) => (
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
                ))
              )}
            </View>
            {game.handResult?.cribBreakdown.length ? (
              <Text style={styles.handBreakdown}>{game.handResult.cribBreakdown.join(', ')}</Text>
            ) : null}
          </View>

          <View style={[styles.logBox, styles.logBoxFlex]}>
            <Text style={styles.sectionLabel}>History</Text>
            {game.peggingLog.length === 0 ? (
              <Text style={styles.emptyPanelText}>No scoring yet.</Text>
            ) : (
              game.peggingLog.slice(-6).map((line, index) => (
                <Text key={index} style={styles.logLine}>
                  {line}
                </Text>
              ))
            )}
          </View>
        </View>

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
                game.pegging.pile.map((card, index) => (
                  <CardView key={`pile-${card.id}-${index}`} card={card} small />
                ))
              )}
            </View>
          </View>
        )}

        {renderSeat('bottom', 'Bottom Hand 🟡', bottomCards)}

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

        {(game.handResult || game.phase === 'round_over') && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Hand Results</Text>
            {game.handResult ? (
              <>
                <Text style={styles.resultLine}>Top hand: +{game.handResult.topHand} pts</Text>
                <Text style={styles.resultLine}>
                  Bottom hand: +{game.handResult.bottomHand} pts
                </Text>
                <Text style={styles.resultLine}>Crib: +{game.handResult.crib} pts</Text>
                <Text style={styles.resultLine}>
                  Combined this hand: +{game.handResult.combinedTotal} pts
                </Text>
              </>
            ) : (
              <Text style={styles.resultLine}>
                The round ended during pegging at {game.board.totalProgress}/{round.targetScore}.
              </Text>
            )}

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
          </View>
        )}
      </ScrollView>

      {abilityTooltip && (
        <Modal transparent animationType="fade" onRequestClose={() => setAbilityTooltip(null)}>
          <Pressable style={styles.tooltipOverlay} onPress={() => setAbilityTooltip(null)}>
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipName}>{abilityTooltip.name}</Text>
              <Text style={styles.tooltipDesc}>{abilityTooltip.description}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function cloneBoard(board: BoardState): BoardState {
  return {
    ...board,
    peg: { ...board.peg },
    lastEffects: [...board.lastEffects],
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B5E20',
  },
  header: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  handsBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
  },
  handsBadgeLabel: {
    color: '#90CAF9',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  handsBadgeValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  roundLabel: {
    color: '#90CAF9',
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subLabel: {
    color: '#E3F2FD',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  scoreBadge: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  scoreBadgeLabel: {
    color: '#90CAF9',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreBadgeValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4CAF50',
  },
  progressTarget: {
    color: '#90CAF9',
    fontSize: 14,
    fontWeight: '700',
  },
  abilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  abilityToken: {
    padding: 4,
  },
  abilityEmoji: {
    fontSize: 20,
  },
  scroll: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  boardWrapper: {
    marginBottom: 12,
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
  middleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 12,
  },
  starterPanel: {
    minWidth: 120,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 10,
    padding: 10,
  },
  cribPanel: {
    minWidth: 190,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 10,
    padding: 10,
  },
  starterInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starterPlaceholder: {
    width: 44,
    height: 62,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
  },
  emptyPanelText: {
    color: '#E8F5E9',
    fontSize: 13,
    marginTop: 6,
  },
  logBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 10,
  },
  logBoxFlex: {
    flex: 1,
    minWidth: 220,
  },
  logLine: {
    color: '#C8E6C9',
    fontSize: 12,
    marginTop: 4,
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
    gap: 6,
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
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBox: {
    backgroundColor: '#1a237e',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: '#90CAF9',
    maxWidth: 320,
  },
  tooltipName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  tooltipDesc: {
    color: '#E3F2FD',
    fontSize: 14,
  },
});
