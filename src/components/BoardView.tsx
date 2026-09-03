import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BoardState, getBoardDefinition } from '../game/boards';

interface BoardViewProps {
  board: BoardState;
  targetScore: number;
}

export default function BoardView({ board, targetScore }: BoardViewProps) {
  const definition = getBoardDefinition(board.boardId);
  const cells = Array.from({ length: definition.trackLength + 1 }, (_, index) => {
    const space = definition.spaces.find((item) => item.position === index);
    const hasTop = board.topPeg.position === index;
    const hasBottom = board.bottomPeg.position === index;
    return { index, space, hasTop, hasBottom };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{definition.name}</Text>
      <Text style={styles.subtitle}>
        {definition.theme} • Progress {board.totalProgress}/{targetScore}
      </Text>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <View key={cell.index} style={[styles.cell, cell.space && styles.effectCell]}>
            <Text style={styles.index}>{cell.index}</Text>
            {cell.space ? (
              <Text style={styles.effectIcon}>{spaceIcon(cell.space.type)}</Text>
            ) : null}
            <View style={styles.pegs}>
              {cell.hasTop && <Text style={styles.topPeg}>🔵</Text>}
              {cell.hasBottom && <Text style={styles.bottomPeg}>🟡</Text>}
            </View>
          </View>
        ))}
      </View>
      {board.lastEffects.length > 0 && (
        <View style={styles.effects}>
          {board.lastEffects.map((line, index) => (
            <Text key={index} style={styles.effectText}>
              • {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function spaceIcon(type: string): string {
  switch (type) {
    case 'boost':
      return '⏩';
    case 'setback':
      return '↩️';
    case 'shortcut':
      return '🪜';
    case 'safe':
      return '🛡️';
    case 'mud':
      return '🫧';
    case 'momentum':
      return '💨';
    case 'checkpoint':
      return '📍';
    default:
      return '•';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#E3F2FD',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: 44,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  effectCell: {
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  index: {
    color: '#90CAF9',
    fontSize: 10,
  },
  effectIcon: {
    fontSize: 13,
  },
  pegs: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  topPeg: {
    fontSize: 12,
  },
  bottomPeg: {
    fontSize: 12,
  },
  effects: {
    gap: 2,
  },
  effectText: {
    color: '#C8E6C9',
    fontSize: 12,
  },
});
