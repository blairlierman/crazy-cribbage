import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ScoreBoardProps {
  playerScore: number;
  aiScore: number;
  targetScore: number;
  roundIndex: number;
}

export default function ScoreBoard({
  playerScore,
  aiScore,
  targetScore,
  roundIndex,
}: ScoreBoardProps) {
  const roundLabels = ['Round 1 (to 31)', 'Round 2 (to 61)', 'Round 3 (to 91)', 'Round 4 (to 121)'];

  return (
    <View style={styles.container}>
      <Text style={styles.roundLabel}>{roundLabels[roundIndex] ?? `Round ${roundIndex + 1}`}</Text>
      <View style={styles.scores}>
        <View style={styles.scoreBlock}>
          <Text style={styles.label}>You</Text>
          <Text style={styles.score}>{playerScore}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.playerBar, { width: `${Math.min(100, (playerScore / targetScore) * 100)}%` }]} />
          </View>
        </View>
        <Text style={styles.target}>/ {targetScore}</Text>
        <View style={styles.scoreBlock}>
          <Text style={styles.label}>AI</Text>
          <Text style={styles.score}>{aiScore}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, styles.aiBar, { width: `${Math.min(100, (aiScore / targetScore) * 100)}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a237e',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  roundLabel: {
    color: '#90CAF9',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scoreBlock: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  score: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  target: {
    color: '#90CAF9',
    fontSize: 14,
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  playerBar: {
    backgroundColor: '#4CAF50',
  },
  aiBar: {
    backgroundColor: '#EF5350',
  },
});
