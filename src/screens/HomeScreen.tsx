import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HomeScreenProps {
  onStartRun: () => void;
}

export default function HomeScreen({ onStartRun }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🃏</Text>
      <Text style={styles.title}>Crazy Cribbage</Text>
      <Text style={styles.subtitle}>Roguelike Edition</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How to Play</Text>
        <Text style={styles.cardText}>
          Beat the AI through 4 rounds: first to <Text style={styles.highlight}>31</Text>, then{' '}
          <Text style={styles.highlight}>61</Text>, then <Text style={styles.highlight}>91</Text>,
          then <Text style={styles.highlight}>121</Text> points.
        </Text>
        <Text style={styles.cardText}>
          Win each round to unlock a new <Text style={styles.highlight}>ability</Text> for future
          rounds!
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={onStartRun} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Start New Run</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#90CAF9',
    marginBottom: 32,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1a237e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    gap: 8,
  },
  cardTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardText: {
    color: '#E3F2FD',
    fontSize: 14,
    lineHeight: 22,
  },
  highlight: {
    color: '#FFD700',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
