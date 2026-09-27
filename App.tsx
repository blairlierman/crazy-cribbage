import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { AbilityId } from './src/game/abilities';
import { getModeConfig, type GameMode } from './src/game/modes';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import RoundCompleteScreen from './src/screens/RoundCompleteScreen';
import RunCompleteScreen from './src/screens/RunCompleteScreen';
import TwoHandGameScreen from './src/screens/TwoHandGameScreen';
import TraceLogButton from './src/components/TraceLogButton';
import { appendTraceEvent, loadTraceEvents, type TraceEvent } from './src/store/traceLog';
import {
  RunState,
  RoundResult,
  advanceRound,
  createInitialRunState,
  currentRound,
} from './src/store/runState';

type AppScreen = 'home' | 'game' | 'round_complete' | 'run_complete';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [run, setRun] = useState<RunState>(createInitialRunState());
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const activeRound = currentRound(run);

  useEffect(() => {
    loadTraceEvents().then(setTraceEvents);
  }, []);

  const trace = (type: string, details?: Record<string, unknown>) => {
    appendTraceEvent(type, details).then((event) => {
      setTraceEvents((events) => [...events, event].slice(-2000));
    });
  };

  const handleStartRun = (mode: GameMode) => {
    setRun(createInitialRunState(mode));
    setLastResult(null);
    setScreen('game');
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
    setLastResult(null);
    setScreen('home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <TraceLogButton events={traceEvents} onClear={() => setTraceEvents([])} />
      {screen === 'home' && <HomeScreen onStartRun={handleStartRun} onTrace={trace} />}
      {screen === 'game' &&
        (run.mode === 'classic' ? (
          <GameScreen
            key={`${run.mode}-${run.currentRoundIndex}`}
            abilities={run.abilities}
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
