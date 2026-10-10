import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card, suitSymbol } from '../game/cards';
import { CARD_IMPROVEMENTS, CardImprovementId } from '../game/cardImprovements';

interface CardImprovementPickerProps {
  cards: Card[];
  title: string;
  subtitle: string;
  onChoose: (card: Card, improvementId: CardImprovementId) => void;
}

export default function CardImprovementPicker({
  cards,
  title,
  subtitle,
  onChoose,
}: CardImprovementPickerProps) {
  const [selected, setSelected] = useState<Card | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>⭐</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {selected ? (
        <>
          <View style={styles.selectedCard}>
            <Text style={styles.cardRank}>{selected.rank}</Text>
            <Text style={[styles.cardSuit, isRed(selected) && styles.red]}>
              {suitSymbol(selected.suit)}
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Choose an improvement</Text>
          {CARD_IMPROVEMENTS[selected.rank].map((improvement) => (
            <TouchableOpacity
              key={improvement.id}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Choose ${improvement.name}: ${improvement.description}`}
              style={styles.improvement}
              onPress={() => onChoose(selected, improvement.id)}
            >
              <Text style={styles.improvementName}>{improvement.name}</Text>
              <Text style={styles.improvementDescription}>{improvement.description}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backButton} onPress={() => setSelected(null)}>
            <Text style={styles.buttonText}>Choose a different card</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Choose one of these cards</Text>
          <View style={styles.cards}>
            {cards.map((card) => (
              <TouchableOpacity
                accessible
                accessibilityRole="button"
                key={card.id}
                accessibilityLabel={`${card.rank} of ${card.suit}`}
                style={styles.card}
                onPress={() => setSelected(card)}
              >
                <Text style={styles.cardRank}>{card.rank}</Text>
                <Text style={[styles.cardSuit, isRed(card) && styles.red]}>
                  {suitSymbol(card.suit)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1b2a',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
    minHeight: '100%',
  },
  emoji: {
    fontSize: 54,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    color: '#90CAF9',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 17,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: 72,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#fff',
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    width: 84,
    height: 116,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRank: {
    color: '#1a1a1a',
    fontSize: 28,
    fontWeight: '700',
  },
  cardSuit: {
    color: '#1a1a1a',
    fontSize: 28,
  },
  red: {
    color: '#C62828',
  },
  improvement: {
    width: '100%',
    backgroundColor: '#1a237e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#3949ab',
  },
  improvementName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
  },
  improvementDescription: {
    color: '#E3F2FD',
    fontSize: 14,
  },
  backButton: {
    backgroundColor: '#455A64',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
