import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BoardSpace, BoardState, getBoardDefinition } from '../game/boards';

interface BoardViewProps {
  board: BoardState;
  targetScore: number;
}

export default function BoardView({ board, targetScore }: BoardViewProps) {
  const definition = getBoardDefinition(board.boardId);
  const [tooltip, setTooltip] = useState<BoardSpace | null>(null);
  const cells = Array.from({ length: definition.trackLength + 1 }, (_, index) => {
    const space = definition.spaces.find((item) => item.position === index);
    const hasLeadPeg = board.peg.position === index;
    const hasTrailPeg = board.trailPosition === index;
    return { index, space, hasLeadPeg, hasTrailPeg };
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
              <TouchableOpacity
                style={styles.effectButton}
                onPress={() => cell.space && setTooltip(cell.space)}
                onLongPress={() => cell.space && setTooltip(cell.space)}
                accessibilityRole="button"
                accessibilityLabel={`${cell.space.label}: ${cell.space.description}`}
                accessibilityHint="Tap to learn what this board space does"
              >
                <Text style={styles.effectIcon}>{spaceIcon(cell.space.type)}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.pegs}>
              {cell.hasTrailPeg && <Text style={styles.trailPeg}>⚪</Text>}
              {cell.hasLeadPeg && <Text style={styles.leadPeg}>🔵</Text>}
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

      {tooltip && (
        <Modal transparent animationType="fade" onRequestClose={() => setTooltip(null)}>
          <Pressable style={styles.tooltipOverlay} onPress={() => setTooltip(null)}>
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipName}>
                {spaceIcon(tooltip.type)} {tooltip.label}
              </Text>
              <Text style={styles.tooltipDesc}>{tooltip.description}</Text>
            </View>
          </Pressable>
        </Modal>
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
  effectButton: {
    minWidth: 18,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  trailPeg: {
    fontSize: 11,
    opacity: 0.85,
  },
  leadPeg: {
    fontSize: 12,
  },
  effects: {
    gap: 2,
  },
  effectText: {
    color: '#C8E6C9',
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
