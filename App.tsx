import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { AbilityId } from './src/game/abilities';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import RoundCompleteScreen from './src/screens/RoundCompleteScreen';
import RunCompleteScreen from './src/screens/RunCompleteScreen';
import { RunState, RoundResult, advanceRound, createInitialRunState } from './src/store/runState';

type AppScreen = 'home' | 'game' | 'round_complete' | 'run_complete';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [run, setRun] = useState<RunState>(createInitialRunState());
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);

  const handleStartRun = () => {
    setRun(createInitialRunState());
    setLastResult(null);
    setScreen('game');
  };

  const handleRoundComplete = (result: RoundResult) => {
    setLastResult(result);
    setScreen('round_complete');
  };

  const handleChooseAbility = (abilityId: string | null) => {
    if (!lastResult) return;

    const newRun = advanceRound(run, lastResult, abilityId as AbilityId | null);
    setRun(newRun);

    if (newRun.runComplete) {
      setScreen('run_complete');
    } else {
      setScreen('game');
    }
  };

  const handleStartNewRun = () => {
    setRun(createInitialRunState());
    setLastResult(null);
    setScreen('home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {screen === 'home' && <HomeScreen onStartRun={handleStartRun} />}
      {screen === 'game' && (
        <GameScreen
          key={run.currentRoundIndex}
          abilities={run.abilities}
          roundIndex={run.currentRoundIndex}
          onRoundComplete={handleRoundComplete}
        />
      )}
      {screen === 'round_complete' && lastResult && (
        <RoundCompleteScreen
          result={lastResult}
          abilities={run.abilities}
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
