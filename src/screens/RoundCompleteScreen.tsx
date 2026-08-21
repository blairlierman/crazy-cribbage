import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ability, rollAbilityChoices } from '../game/abilities';
import { UnlockedAbilities } from '../game/abilities';
import { ROUND_TARGETS, RoundResult } from '../store/runState';

interface RoundCompleteScreenProps {
  result: RoundResult;
  abilities: UnlockedAbilities;
  onChooseAbility: (abilityId: string | null) => void;
}

export default function RoundCompleteScreen({
  result,
  abilities,
  onChooseAbility,
}: RoundCompleteScreenProps) {
  const [choices] = useState<Ability[]>(() => rollAbilityChoices(abilities, 3));
  const [chosen, setChosen] = useState<string | null>(null);
  const nextTarget = ROUND_TARGETS[result.roundIndex + 1];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>{result.playerWon ? '🏆' : '💀'}</Text>
      <Text style={styles.title}>
        {result.playerWon ? 'Round Complete!' : 'Defeated!'}
      </Text>
      <Text style={styles.targetText}>
        {result.playerWon
          ? `You reached ${result.playerFinalScore} pts (target: ${result.targetScore})`
          : `You scored ${result.playerFinalScore} — AI had ${result.aiFinalScore}`}
      </Text>

      {result.playerWon && choices.length > 0 && (
        <>
          <Text style={styles.chooseLabel}>Choose an Upgrade:</Text>
          {choices.map((ability) => (
            <TouchableOpacity
              key={ability.id}
              style={[styles.abilityCard, chosen === ability.id && styles.abilitySelected]}
              onPress={() => setChosen(ability.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.abilityName}>{ability.name}</Text>
              <Text style={styles.abilityDesc}>{ability.description}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.btn, !chosen && styles.btnDisabled]}
            onPress={() => onChooseAbility(chosen)}
            disabled={!chosen}
          >
            <Text style={styles.btnText}>
              {nextTarget ? `Continue to Round ${result.roundIndex + 2} (to ${nextTarget})` : 'Finish!'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => onChooseAbility(null)}
          >
            <Text style={styles.btnText}>Skip Upgrade</Text>
          </TouchableOpacity>
        </>
      )}

      {(!result.playerWon || choices.length === 0) && (
        <TouchableOpacity style={styles.btn} onPress={() => onChooseAbility(null)}>
          <Text style={styles.btnText}>{result.playerWon ? 'Continue →' : 'Back to Menu'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  targetText: {
    color: '#90CAF9',
    fontSize: 15,
    marginBottom: 28,
    textAlign: 'center',
  },
  chooseLabel: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  abilityCard: {
    width: '100%',
    backgroundColor: '#1a237e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  abilitySelected: {
    borderColor: '#FFD700',
    backgroundColor: '#283593',
  },
  abilityName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  abilityDesc: {
    color: '#E3F2FD',
    fontSize: 13,
  },
  btn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#455A64',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
