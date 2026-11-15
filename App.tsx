import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { AbilityId } from './src/game/abilities';
import { getModeConfig, type GameMode } from './src/game/modes';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import RoundCompleteScreen from './src/screens/RoundCompleteScreen';
import RunCompleteScreen from './src/screens/RunCompleteScreen';
import TwoHandGameScreen from './src/screens/TwoHandGameScreen';
import SettingsButton from './src/components/SettingsButton';
import CardImprovementPicker from './src/components/CardImprovementPicker';
import { appendTraceEvent, loadTraceEvents, type TraceEvent } from './src/store/traceLog';
import { Card } from './src/game/cards';
import { CardImprovementId, rollCardImprovementChoices } from './src/game/cardImprovements';
import {
  RunState,
  RoundResult,
  advanceRound,
  addCardImprovement,
  createInitialRunState,
  currentRound,
} from './src/store/runState';

type AppScreen = 'home' | 'card_reward' | 'game' | 'round_complete' | 'run_complete';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [run, setRun] = useState<RunState>(createInitialRunState());
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [cardRewardChoices, setCardRewardChoices] = useState<Card[]>([]);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const traceSyncQueue = useRef(Promise.resolve());
  const activeRound = currentRound(run);

  const syncTraceEvents = (operation?: Promise<unknown>) => {
    const next = traceSyncQueue.current
      .then(() => operation)
      .then(() => loadTraceEvents())
      .then(setTraceEvents);
    traceSyncQueue.current = next.catch(() => undefined);
    return traceSyncQueue.current;
  };

  useEffect(() => {
    void syncTraceEvents();
  }, []);

  const trace = (type: string, details?: object) => {
    void syncTraceEvents(appendTraceEvent(type, details));
  };

  const handleStartRun = (mode: GameMode) => {
    const newRun = createInitialRunState(mode);
    setRun(newRun);
    setCardRewardChoices(rollCardImprovementChoices(newRun.cardImprovements));
    setLastResult(null);
    setScreen('card_reward');
  };

  const handleChooseCardImprovement = (card: Card, improvementId: CardImprovementId) => {
    trace('choose_card_improvement', { cardId: card.id, improvementId });
    setRun((current) => addCardImprovement(current, card.id, improvementId));
    setScreen('game');
  };

  const applyCardImprovement = (card: Card, improvementId: CardImprovementId) => {
    trace('choose_card_improvement', { cardId: card.id, improvementId });
    setRun((current) => addCardImprovement(current, card.id, improvementId));
  };

  const handleRoundComplete = (result: RoundResult) => {
    trace('show_round_complete');
    setLastResult(result);
    setScreen('round_complete');
  };

  const handleChooseAbility = (abilityId: string | null) => {
    if (!lastResult) return;

    trace('choose_upgrade', { abilityId });
    const newRun = advanceRound(run, lastResult, abilityId as AbilityId | null);
    setRun(newRun);

    if (newRun.runComplete) {
      setScreen('run_complete');
    } else {
      setScreen('game');
    }
  };

  const handleStartNewRun = () => {
    trace('start_new_run');
    setRun(createInitialRunState());
    setCardRewardChoices([]);
    setLastResult(null);
    setScreen('home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <SettingsButton events={traceEvents} onClear={() => syncTraceEvents()} />
      {screen === 'home' && <HomeScreen onStartRun={handleStartRun} onTrace={trace} />}
      {screen === 'card_reward' && (
        <CardImprovementPicker
          cards={cardRewardChoices}
          title="Run Started!"
          subtitle="Choose a card and one improvement to keep for this run."
          onChoose={handleChooseCardImprovement}
        />
      )}
      {screen === 'game' &&
        (run.mode === 'classic' ? (
          <GameScreen
            key={`${run.mode}-${run.currentRoundIndex}`}
            abilities={run.abilities}
            cardImprovements={run.cardImprovements}
            onChooseCardImprovement={applyCardImprovement}
            roundIndex={run.currentRoundIndex}
            round={activeRound}
            mode={run.mode}
            onRoundComplete={handleRoundComplete}
            onTrace={trace}
          />
        ) : (
          <TwoHandGameScreen
            key={`${run.mode}-${run.currentRoundIndex}`}
            abilities={run.abilities}
            cardImprovements={run.cardImprovements}
            onChooseCardImprovement={applyCardImprovement}
            roundIndex={run.currentRoundIndex}
            round={activeRound}
            mode={run.mode}
            onRoundComplete={handleRoundComplete}
            onTrace={trace}
          />
        ))}
      {screen === 'round_complete' && lastResult && (
        <RoundCompleteScreen
          result={lastResult}
          abilities={run.abilities}
          mode={run.mode}
          rewardChoices={getModeConfig(run.mode).rounds[lastResult.roundIndex].rewardChoices}
          onChooseAbility={handleChooseAbility}
        />
      )}
      {screen === 'run_complete' && (
        <RunCompleteScreen run={run} onStartNewRun={handleStartNewRun} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
});
