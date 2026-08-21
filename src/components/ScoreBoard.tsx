import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ALL_ABILITIES, UnlockedAbilities } from '../game/abilities';

interface ScoreBoardProps {
  playerScore: number;
  aiScore: number;
  targetScore: number;
  roundIndex: number;
  abilities?: UnlockedAbilities;
}

export default function ScoreBoard({
  playerScore,
  aiScore,
  targetScore,
  roundIndex,
  abilities,
}: ScoreBoardProps) {
  const roundLabels = ['Round 1 (to 31)', 'Round 2 (to 61)', 'Round 3 (to 91)', 'Round 4 (to 121)'];
  const [tooltip, setTooltip] = useState<{ name: string; description: string } | null>(null);

  // Build list of earned ability tokens (one per stack)
  const abilityTokens: Array<{ id: string; name: string; description: string; emoji: string }> = [];
  if (abilities) {
    for (const ability of ALL_ABILITIES) {
      const stacks = abilities[ability.id] ?? 0;
      for (let i = 0; i < stacks; i++) {
        abilityTokens.push({
          id: `${ability.id}-${i}`,
          name: ability.name,
          description: ability.description,
          emoji: ability.emoji,
        });
      }
    }
  }

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

      {abilityTokens.length > 0 && (
        <View style={styles.abilityRow}>
          {abilityTokens.map((token) => (
            <TouchableOpacity
              key={token.id}
              style={styles.abilityToken}
              onPress={() => setTooltip({ name: token.name, description: token.description })}
              onLongPress={() => setTooltip({ name: token.name, description: token.description })}
              accessibilityRole="button"
              accessibilityLabel={`${token.name}: ${token.description}`}
              accessibilityHint="Tap or long press to view ability description"
            >
              <Text style={styles.abilityEmoji}>{token.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tooltip && (
        <Modal transparent animationType="fade" onRequestClose={() => setTooltip(null)}>
          <Pressable style={styles.tooltipOverlay} onPress={() => setTooltip(null)}>
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipName}>{tooltip.name}</Text>
              <Text style={styles.tooltipDesc}>{tooltip.description}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
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
  abilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  abilityToken: {
    padding: 4,
  },
  abilityEmoji: {
    fontSize: 20,
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
