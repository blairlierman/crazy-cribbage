import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, suitSymbol } from '../game/cards';
import { CardImprovement } from '../game/cardImprovements';

interface CardViewProps {
  card: Card;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
  improvement?: CardImprovement | null;
}

export default function CardView({
  card,
  onPress,
  selected = false,
  disabled = false,
  small = false,
  faceDown = false,
  improvement,
}: CardViewProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const [showImprovement, setShowImprovement] = useState(false);

  if (faceDown) {
    return (
      <View style={[styles.card, small && styles.smallCard, styles.faceDown]}>
        <Text style={styles.faceDownText}>🂠</Text>
      </View>
    );
  }

  const content = (
    <View style={styles.cardContent}>
      <Text style={[styles.rank, isRed && styles.red, small && styles.smallRank]}>{card.rank}</Text>
      <Text style={[styles.suit, isRed && styles.red, small && styles.smallSuit]}>
        {suitSymbol(card.suit)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.cardWrapper, small && styles.smallCardWrapper]}>
      {onPress ? (
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${card.rank} of ${card.suit}`}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.card,
              small && styles.smallCard,
              selected && styles.selected,
              disabled && styles.disabled,
            ]}
          >
            {content}
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.card,
            small && styles.smallCard,
            selected && styles.selected,
            disabled && styles.disabled,
          ]}
        >
          {content}
        </View>
      )}
      {improvement && (
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${improvement.name}: ${improvement.description}`}
          style={[styles.improvementStar, small && styles.smallImprovementStar]}
          onPress={() => setShowImprovement(true)}
        >
          <Text style={[styles.starText, small && styles.smallStarText]}>★</Text>
        </TouchableOpacity>
      )}
      {improvement && (
        <Modal
          transparent
          animationType="fade"
          visible={showImprovement}
          onRequestClose={() => setShowImprovement(false)}
        >
          <Pressable style={styles.tooltipOverlay} onPress={() => setShowImprovement(false)}>
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipName}>{improvement.name}</Text>
              <Text style={styles.tooltipDesc}>{improvement.description}</Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
    margin: 4,
  },
  smallCardWrapper: {
    margin: 2,
  },
  card: {
    width: 60,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ccc',
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
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  improvementStar: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallImprovementStar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  starText: {
    color: '#5D4037',
    fontSize: 16,
    fontWeight: '800',
  },
  smallStarText: {
    fontSize: 12,
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
