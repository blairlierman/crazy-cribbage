import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RunState, ROUND_TARGETS } from '../store/runState';
import { ALL_ABILITIES } from '../game/abilities';

interface RunCompleteScreenProps {
  run: RunState;
  onStartNewRun: () => void;
}

export default function RunCompleteScreen({ run, onStartNewRun }: RunCompleteScreenProps) {
  const unlockedAbilityIds = Object.keys(run.abilities) as (keyof typeof run.abilities)[];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>{run.runWon ? '🎊' : '💔'}</Text>
      <Text style={styles.title}>{run.runWon ? 'You Won the Run!' : 'Run Over'}</Text>
      <Text style={styles.subtitle}>
        {run.runWon
          ? 'You conquered all 4 rounds. Incredible!'
          : `You made it through ${run.roundResults.length} round${run.roundResults.length !== 1 ? 's' : ''}.`}
      </Text>

      {/* Round Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Round Summary</Text>
        {ROUND_TARGETS.map((target, idx) => {
          const result = run.roundResults[idx];
          return (
            <View key={idx} style={styles.roundRow}>
              <Text style={styles.roundLabel}>
                Round {idx + 1} (to {target})
              </Text>
              {result ? (
                <Text style={[styles.roundResult, result.playerWon ? styles.win : styles.loss]}>
                  {result.playerWon
                    ? `✓ Win (${result.playerFinalScore} pts)`
                    : `✗ Loss (${result.playerFinalScore} pts)`}
                </Text>
              ) : (
                <Text style={styles.roundSkipped}>—</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Abilities Collected */}
      {unlockedAbilityIds.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Abilities Collected</Text>
          {unlockedAbilityIds.map((id) => {
            const ability = ALL_ABILITIES.find((a) => a.id === id);
            return ability ? (
              <Text key={id} style={styles.abilityLine}>
                {ability.emoji} {ability.name}
              </Text>
            ) : null;
          })}
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={onStartNewRun}>
        <Text style={styles.btnText}>New Run</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0d1b2a',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#90CAF9',
    fontSize: 15,
    marginBottom: 28,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1a237e',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  roundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  roundLabel: {
    color: '#E3F2FD',
    fontSize: 14,
  },
  roundResult: {
    fontSize: 13,
    fontWeight: '600',
  },
  roundSkipped: {
    color: '#546E7A',
    fontSize: 13,
  },
  win: {
    color: '#66BB6A',
  },
  loss: {
    color: '#EF5350',
  },
  abilityLine: {
    color: '#E3F2FD',
    fontSize: 13,
    paddingVertical: 2,
  },
  btn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    marginTop: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
