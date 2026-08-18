import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, suitSymbol } from '../game/cards';

interface CardViewProps {
  card: Card;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
}

export default function CardView({
  card,
  onPress,
  selected = false,
  disabled = false,
  small = false,
  faceDown = false,
}: CardViewProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  if (faceDown) {
    return (
      <View style={[styles.card, small && styles.smallCard, styles.faceDown]}>
        <Text style={styles.faceDownText}>🂠</Text>
      </View>
    );
  }

  const inner = (
    <View
      style={[
        styles.card,
        small && styles.smallCard,
        selected && styles.selected,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.rank, isRed && styles.red, small && styles.smallRank]}>
        {card.rank}
      </Text>
      <Text style={[styles.suit, isRed && styles.red, small && styles.smallSuit]}>
        {suitSymbol(card.suit)}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ccc',
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  smallCard: {
    width: 44,
    height: 62,
    margin: 2,
    borderRadius: 6,
  },
  selected: {
    borderColor: '#2196F3',
    borderWidth: 2.5,
    backgroundColor: '#E3F2FD',
    transform: [{ translateY: -8 }],
  },
  disabled: {
    opacity: 0.45,
  },
  faceDown: {
    backgroundColor: '#1565C0',
    borderColor: '#0D47A1',
  },
  faceDownText: {
    fontSize: 36,
    color: '#1565C0',
  },
  rank: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 26,
  },
  smallRank: {
    fontSize: 16,
    lineHeight: 20,
  },
  suit: {
    fontSize: 20,
    color: '#1a1a1a',
  },
  smallSuit: {
    fontSize: 14,
  },
  red: {
    color: '#C62828',
  },
});
