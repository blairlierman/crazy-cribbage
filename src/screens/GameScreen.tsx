import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { aiChooseDiscards, aiChoosePeggingCard } from '../ai/aiLogic';
import CardView from '../components/CardView';
import ScoreBoard from '../components/ScoreBoard';
import { Card, cardValue, sortCards } from '../game/cards';
import {
  GameState,
  awardGo,
  canAdvanceFromRound,
  createInitialGameState,
  dealHands,
  playerDiscard,
  playerPass,
  playerPlayCard,
  playerSwap,
  rerollStarter,
  resetPeggingPile,
  scoreShow,
} from '../game/gameState';
import { UnlockedAbilities, hasAbility } from '../game/abilities';
import { scorePegging } from '../game/scoring';
import { ROUND_TARGETS, RoundResult } from '../store/runState';

interface GameScreenProps {
  abilities: UnlockedAbilities;
  roundIndex: number;
  onRoundComplete: (result: RoundResult) => void;
}

export default function GameScreen({ abilities, roundIndex, onRoundComplete }: GameScreenProps) {
  const target = ROUND_TARGETS[roundIndex];
  const { width } = useWindowDimensions();
  const wideLayout = width >= 600;
  const [game, setGame] = useState<GameState>(() => {
    const s = createInitialGameState(abilities, target, 'player');
    return dealHands(s);
  });
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [swapSelected, setSwapSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [handSortOrder, setHandSortOrder] = useState<'suit' | 'rank'>('suit');
  const aiThinkingRef = useRef(false);

  const discardCount = hasAbility(abilities, 'extra_discard') ? 3 : 2;
  const sortedPlayerHand = useMemo(
    () =>
      sortCards(
        game.phase === 'pegging' ? game.pegging.playerCards : game.player.hand,
        handSortOrder,
      ),
    [game.phase, game.pegging.playerCards, game.player.hand, handSortOrder],
  );

  // ─── Deal a fresh hand ───────────────────────────────────────────────
  const deal = useCallback(() => {
    setGame((g) => dealHands(g));
    setSelectedCards([]);
    setSwapSelected(null);
    setShowResult(false);
    aiThinkingRef.current = false;
  }, []);

  // ─── AI Discard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (game.phase !== 'discard' && game.phase !== 'peek_starter') return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;

    const timer = setTimeout(() => {
      setGame((g) => {
        const aiDiscards = aiChooseDiscards(g.ai.hand, g.starter);
        const newAiHand = g.ai.hand.filter((c) => !aiDiscards.some((d) => d.id === c.id));
        const crib = [...g.crib, ...aiDiscards];
        return {
          ...g,
          ai: { ...g.ai, hand: newAiHand, discards: aiDiscards },
          crib,
        };
      });
      aiThinkingRef.current = false;
    }, 600);

    return () => clearTimeout(timer);
  }, [game.phase]);

  // ─── AI Pegging ──────────────────────────────────────────────────────
  useEffect(() => {
    if (game.phase !== 'pegging') return;
    if (game.winner) return;
    const pegging = game.pegging;

    // It's AI's turn: player just played (or passed), AI needs to respond
    const playerCanPlay = pegging.playerCards.some((c) => cardValue(c) + pegging.count <= 31);
    const aiCanPlay = pegging.aiCards.some((c) => cardValue(c) + pegging.count <= 31);

    // Determine if we're waiting on AI
    const lastWasPlayer = pegging.lastToPlay === 'player' || pegging.lastToPlay === null;
    const playerJustPassed = pegging.playerPassed;
    // If the player has no cards left but AI does, the AI must keep playing
    const playerOutOfCards = pegging.playerCards.length === 0 && pegging.aiCards.length > 0;

    if (!lastWasPlayer && !playerJustPassed && !playerOutOfCards) return;
    if (aiThinkingRef.current) return;

    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      setGame((g) => {
        const p = g.pegging;
        const aiCard = aiChoosePeggingCard(p.aiCards, p.count, p.pile);

        if (aiCard) {
          const newPile = [...p.pile, aiCard];
          const newCount = p.count + cardValue(aiCard);
          const newAiCards = p.aiCards.filter((c) => c.id !== aiCard.id);
          const newPlayedCards = [...p.playedCards, { card: aiCard, playedBy: 'ai' as const }];
          const score = scorePegging(newPile, aiCard);
          const log = [...g.peggingLog];
          if (score.details.length > 0) {
            log.push(`AI: ${score.details.join(', ')}`);
          }
          let aiScore = g.ai.score + score.total;
          let newPegging = {
            ...p,
            pile: newPile,
            playedCards: newPlayedCards,
            count: newCount,
            aiCards: newAiCards,
            playerPassed: false,
            lastToPlay: 'ai' as const,
          };
          if (newCount === 31) {
            newPegging = {
              ...newPegging,
              pile: [],
              count: 0,
              playerPassed: false,
              aiPassed: false,
              pileResetCount: newPegging.pileResetCount + 1,
            };
          }
          let updated = {
            ...g,
            ai: { ...g.ai, score: aiScore },
            pegging: newPegging,
            peggingLog: log,
          };
          if (aiScore >= g.targetScore)
            updated = { ...updated, winner: 'ai', phase: 'round_over' as const };
          aiThinkingRef.current = false;
          return updated;
        } else {
          // AI cannot play
          const playerCanPlayNow = p.playerCards.some((c) => cardValue(c) + p.count <= 31);
          if (!playerCanPlayNow) {
            // Both can't play: go to last player, reset pile
            const recipient = p.lastToPlay ?? 'player';
            let updated = awardGo(g, recipient);
            updated = resetPeggingPile(updated, recipient);
            aiThinkingRef.current = false;
            return updated;
          }
          // AI passes; mark ai passed
          aiThinkingRef.current = false;
          return { ...g, pegging: { ...p, aiPassed: true, lastToPlay: 'ai' as const } };
        }
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [
    game.pegging.lastToPlay,
    game.pegging.playerPassed,
    game.pegging.playerCards.length,
    game.pegging.aiCards.length,
    game.pegging.pileResetCount,
    game.phase,
    game.winner,
  ]);

  // ─── Check pegging complete → show ──────────────────────────────────
  useEffect(() => {
    if (game.phase !== 'pegging') return;
    if (game.winner) return;
    const { playerCards, aiCards } = game.pegging;
    if (playerCards.length === 0 && aiCards.length === 0) {
      // All cards played - last card goes to last player
      const g = awardGo(game, game.pegging.lastToPlay ?? 'player');
      const scored = scoreShow(g);
      setGame(scored);
      setShowResult(true);
    }
  }, [game.pegging.playerCards, game.pegging.aiCards]);

  // ─── Handle player card selection during discard ─────────────────────
  const toggleSelectCard = (cardId: string) => {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= discardCount) return prev;
      return [...prev, cardId];
    });
  };

  // ─── Confirm Discard ─────────────────────────────────────────────────
  const confirmDiscard = () => {
    if (selectedCards.length !== discardCount) return;
    const cards = game.player.hand.filter((c) => selectedCards.includes(c.id));
    setGame((g) => {
      const newState = playerDiscard(g, cards);
      const crib = [...newState.crib, ...cards];
      return { ...newState, crib };
    });
    setSelectedCards([]);
  };

  // ─── Swap card ───────────────────────────────────────────────────────
  const confirmSwap = () => {
    const card = game.player.hand.find((c) => c.id === swapSelected) ?? null;
    setGame((g) => playerSwap(g, card));
    setSwapSelected(null);
  };

  // ─── Play a pegging card ──────────────────────────────────────────────
  const playCard = (card: Card) => {
    if (game.phase !== 'pegging') return;
    if (game.winner) return;
    if (game.pegging.lastToPlay === 'player') return;
    const canPlay = cardValue(card) + game.pegging.count <= 31;
    if (!canPlay) return;
    setGame((g) => playerPlayCard(g, card));
  };

  // ─── Player passes ───────────────────────────────────────────────────
  const handlePass = () => {
    setGame((g) => {
      const p = g.pegging;
      const aiCanPlay = p.aiCards.some((c) => cardValue(c) + p.count <= 31);
      if (!aiCanPlay) {
        // Both can't play; last player who played gets go
        const recipient = p.lastToPlay ?? 'ai';
        let updated = awardGo(g, recipient);
        updated = resetPeggingPile(updated, recipient);
        return updated;
      }
      return playerPass(g);
    });
  };

  // ─── Next hand / complete round ───────────────────────────────────────
  const handleNextHand = () => {
    if (game.winner) {
      const result: RoundResult = {
        roundIndex,
        targetScore: target,
        playerWon: game.winner === 'player',
        playerFinalScore: game.player.score,
        aiFinalScore: game.ai.score,
      };
      onRoundComplete(result);
      return;
    }
    deal();
  };

  const isPlayerTurn = game.phase === 'pegging' && game.pegging.lastToPlay !== 'player';

  const canPlayerPlay =
    isPlayerTurn && game.pegging.playerCards.some((c) => cardValue(c) + game.pegging.count <= 31);

  const canPlayerPass = isPlayerTurn && !canPlayerPlay && game.pegging.playerCards.length > 0;

  const cribOwner = game.dealer === 'player' ? 'player' : 'ai';
  const cribOwnerEmoji = cribOwner === 'player' ? '👤' : '🤖';
  const cribOwnerText = cribOwner === 'player' ? 'Your crib' : "AI's crib";
  const visibleCribOwner =
    game.phase === 'pegging' ? game.dealer : (game.handResult?.cribOwner ?? game.dealer);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScoreBoard
        playerScore={game.player.score}
        aiScore={game.ai.score}
        targetScore={target}
        roundIndex={roundIndex}
        abilities={game.abilities}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* AI Hand + Crib (crib to the right on wide screens) */}
        <View style={wideLayout ? styles.handAndCribRow : undefined}>
          <View style={[styles.section, wideLayout ? styles.handFlex : undefined]}>
            <Text style={styles.sectionLabel}>
              {showResult || game.phase === 'show' || game.phase === 'round_over'
                ? `AI Hand 🤖 (+${game.handResult?.aiHand ?? 0} pts)`
                : game.phase === 'pegging'
                  ? `AI Hand 🤖 (${game.pegging.aiCards.length} cards)`
                  : `AI Hand 🤖 (${game.ai.hand.length} cards)`}
            </Text>
            <View style={styles.row}>
              {showResult || game.phase === 'show' || game.phase === 'round_over'
                ? game.ai.hand.map((c) => <CardView key={c.id} card={c} small />)
                : game.ai.hand.map((c) => <CardView key={c.id} card={c} faceDown small />)}
            </View>
            {(showResult || game.phase === 'show' || game.phase === 'round_over') &&
            game.handResult?.aiHandBreakdown.length ? (
              <Text style={styles.handBreakdown}>{game.handResult.aiHandBreakdown.join(', ')}</Text>
            ) : null}
          </View>

          {/* Crib — shown next to AI hand when AI owns it */}
          {((showResult || game.phase === 'show' || game.phase === 'round_over') &&
            game.handResult?.cribOwner === 'ai') ||
          (game.phase === 'pegging' && game.dealer === 'ai' && game.crib.length > 0) ? (
            <View style={[styles.section, wideLayout ? styles.cribFlex : undefined]}>
              <Text style={styles.sectionLabel}>
                {game.phase === 'pegging'
                  ? "Crib (AI's 🤖)"
                  : `Crib (AI's 🤖, +${game.handResult?.crib ?? 0} pts)`}
              </Text>
              <View style={styles.row}>
                {game.crib.slice(0, 4).map((c) => (
                  <CardView
                    key={c.id + '-crib'}
                    card={c}
                    small
                    faceDown={game.phase === 'pegging'}
                  />
                ))}
              </View>
              {game.phase !== 'pegging' && game.handResult?.cribBreakdown.length ? (
                <Text style={styles.handBreakdown}>{game.handResult.cribBreakdown.join(', ')}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Pegging Pile */}
        {game.phase === 'pegging' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pile (Count: {game.pegging.count})</Text>
            <View style={styles.row}>
              {game.pegging.pile.length === 0 ? (
                <Text style={styles.placeholderText}>Empty</Text>
              ) : (
                game.pegging.pile.map((c) => {
                  const pc = game.pegging.playedCards.find((p) => p.card.id === c.id);
                  const byAi = pc?.playedBy === 'ai';
                  return (
                    <View
                      key={c.id + '-pile'}
                      style={byAi ? styles.pileCardAi : styles.pileCardPlayer}
                    >
                      <CardView card={c} small />
                    </View>
                  );
                })
              )}
            </View>
            {game.pegging.aiPassed && <Text style={styles.aiPassed}>AI says Go!</Text>}
          </View>
        )}

        {/* Pegging Log + Starter Card */}
        {(game.peggingLog.length > 0 || game.starter) && (
          <View style={styles.historyRow}>
            {game.peggingLog.length > 0 && (
              <View style={[styles.logBox, styles.logBoxFlex]}>
                {game.peggingLog.slice(-5).map((line, i) => (
                  <Text key={i} style={styles.logLine}>
                    {line}
                  </Text>
                ))}
              </View>
            )}

            {(game.starter || (game.luckyRerollAvailable && game.starter)) && (
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

                  {game.luckyRerollAvailable && game.starter && (
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => setGame(rerollStarter)}
                    >
                      <Text style={styles.smallBtnText}>🎲</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Player Hand + Crib (crib to the right on wide screens) */}
        <View style={wideLayout ? styles.handAndCribRow : undefined}>
          <View style={[styles.section, wideLayout ? styles.handFlex : undefined]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>
                {game.phase === 'discard' || game.phase === 'peek_starter'
                  ? `Your Hand 👤 — Select ${discardCount} to discard`
                  : game.phase === 'swap'
                    ? 'Your Hand 👤 — Select a card to swap (or skip)'
                    : game.phase === 'pegging'
                      ? `Your Hand 👤 — Count: ${game.pegging.count}`
                      : 'Your Hand 👤'}
              </Text>
              <View style={styles.titleWithToggle}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    handSortOrder === 'suit'
                      ? 'Sort hands by suit first'
                      : 'Sort hands by rank first'
                  }
                  style={styles.sortToggle}
                  onPress={() => setHandSortOrder((prev) => (prev === 'suit' ? 'rank' : 'suit'))}
                >
                  <Text style={styles.sortToggleText}>
                    {handSortOrder === 'suit' ? '♠️' : '🔢'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.row}>
              {sortedPlayerHand.map((c) => {
                const isSelected = selectedCards.includes(c.id);
                const isSwapSelected = swapSelected === c.id;

                return (
                  <CardView
                    key={c.id}
                    card={c}
                    selected={isSelected || isSwapSelected}
                    disabled={
                      game.phase === 'pegging' &&
                      (cardValue(c) + game.pegging.count > 31 ||
                        game.pegging.lastToPlay === 'player')
                    }
                    onPress={
                      game.phase === 'discard' || game.phase === 'peek_starter'
                        ? () => toggleSelectCard(c.id)
                        : game.phase === 'swap'
                          ? () => setSwapSelected(c.id === swapSelected ? null : c.id)
                          : game.phase === 'pegging'
                            ? () => playCard(c)
                            : undefined
                    }
                  />
                );
              })}
            </View>
          </View>

          {/* Crib — shown next to player hand when player owns it */}
          {((showResult || game.phase === 'show' || game.phase === 'round_over') &&
            game.handResult?.cribOwner === 'player') ||
          (game.phase === 'pegging' && game.dealer === 'player' && game.crib.length > 0) ? (
            <View style={[styles.section, wideLayout ? styles.cribFlex : undefined]}>
              <Text style={styles.sectionLabel}>
                {game.phase === 'pegging'
                  ? 'Crib (yours 👤)'
                  : `Crib (yours 👤, +${game.handResult?.crib ?? 0} pts)`}
              </Text>
              <View style={styles.row}>
                {game.crib.slice(0, 4).map((c) => (
                  <CardView
                    key={c.id + '-crib'}
                    card={c}
                    small
                    faceDown={game.phase === 'pegging'}
                  />
                ))}
              </View>
              {game.phase !== 'pegging' && game.handResult?.cribBreakdown.length ? (
                <Text style={styles.handBreakdown}>{game.handResult.cribBreakdown.join(', ')}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {(game.phase === 'discard' || game.phase === 'peek_starter') && (
            <TouchableOpacity
              style={[styles.btn, selectedCards.length !== discardCount && styles.btnDisabled]}
              onPress={confirmDiscard}
              disabled={selectedCards.length !== discardCount}
            >
              <Text style={styles.btnText}>
                Discard to {cribOwnerText} {cribOwnerEmoji} ({selectedCards.length}/{discardCount})
              </Text>
            </TouchableOpacity>
          )}

          {game.phase === 'swap' && (
            <>
              <TouchableOpacity
                style={[styles.btn, !swapSelected && styles.btnDisabled]}
                onPress={confirmSwap}
                disabled={!swapSelected}
              >
                <Text style={styles.btnText}>Swap Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setGame((g) => playerSwap(g, null))}
              >
                <Text style={styles.btnText}>Skip Swap</Text>
              </TouchableOpacity>
            </>
          )}

          {canPlayerPass && (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handlePass}>
              <Text style={styles.btnText}>Go!</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Show Results */}
        {(game.phase === 'round_over' || showResult) && canAdvanceFromRound(game) && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Hand Results</Text>
            {game.handResult ? (
              <>
                {game.handResult.playerHand > 0 && (
                  <Text style={styles.resultLine}>
                    Your hand: +{game.handResult.playerHand} pts
                    {game.handResult.playerHandBreakdown.length > 0 &&
                      ` (${game.handResult.playerHandBreakdown.join(', ')})`}
                  </Text>
                )}
                {game.handResult.aiHand > 0 && (
                  <Text style={styles.resultLine}>AI hand: +{game.handResult.aiHand} pts</Text>
                )}
                {game.handResult.crib > 0 && (
                  <Text style={styles.resultLine}>
                    Crib ({game.handResult.cribOwner === 'player' ? 'yours' : "AI's"}): +
                    {game.handResult.crib} pts
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.resultLine}>
                Pegging ended with a game-winning score. Continue to the next hand.
              </Text>
            )}

            {game.winner && (
              <Text
                style={[
                  styles.winnerText,
                  game.winner === 'player' ? styles.playerWon : styles.aiWon,
                ]}
              >
                {game.winner === 'player' ? '🎉 You win the round!' : '💀 AI wins the round!'}
              </Text>
            )}

            <TouchableOpacity style={styles.btn} onPress={handleNextHand}>
              <Text style={styles.btnText}>{game.winner ? 'Continue →' : 'Next Hand →'}</Text>
            </TouchableOpacity>
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
  },
  section: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  titleWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    color: '#A5D6A7',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    flexShrink: 1,
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
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
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
  aiPassed: {
    color: '#FFD700',
    marginTop: 4,
    fontStyle: 'italic',
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
    justifyContent: 'center',
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
  smallBtn: {
    backgroundColor: '#F57F17',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    margin: 4,
    alignSelf: 'center',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 4,
  },
  resultLine: {
    color: '#E8F5E9',
    fontSize: 14,
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
  // Pile card offsets: AI-played cards float up, player-played cards float down
  pileCardAi: {
    transform: [{ translateY: -8 }],
  },
  pileCardPlayer: {
    transform: [{ translateY: 8 }],
  },
  handBreakdown: {
    color: '#A5D6A7',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  handAndCribRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  handFlex: {
    flex: 2,
  },
  cribFlex: {
    flex: 1,
  },
});
