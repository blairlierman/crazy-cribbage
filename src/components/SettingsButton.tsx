import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clearTraceEvents, exportTraceEvents, type TraceEvent } from '../store/traceLog';

interface SettingsButtonProps {
  events: TraceEvent[];
  onClear: () => void;
}

export default function SettingsButton({ events, onClear }: SettingsButtonProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      await exportTraceEvents(events);
      setMessage('Trace log ready to share.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to export trace log.');
    }
  };

  const handleClear = async () => {
    await clearTraceEvents();
    onClear();
    setMessage('Trace log cleared.');
  };

  return (
    <>
      <TouchableOpacity
        accessible
        accessibilityLabel="Open settings"
        accessibilityRole="button"
        style={styles.openButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.openButtonText}>⚙️</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.sectionTitle}>Trace Log</Text>
            <Text style={styles.description}>
              {events.length} event{events.length === 1 ? '' : 's'} recorded. This log stays on this
              device until you clear it.
            </Text>
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              style={styles.button}
              onPress={handleExport}
            >
              <Text style={styles.buttonText}>
                {Platform.OS === 'web' ? 'Download Trace Log' : 'Share Trace Log'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={handleClear}
            >
              <Text style={styles.buttonText}>Clear Trace Log</Text>
            </TouchableOpacity>
            {message && <Text style={styles.message}>{message}</Text>}
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              onPress={() => setVisible(false)}
            >
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: { position: 'absolute', top: 8, right: 12, padding: 8, zIndex: 2 },
  openButtonText: { fontSize: 22 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1a237e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  title: { color: '#FFD700', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  description: { color: '#E3F2FD', lineHeight: 20, marginBottom: 18 },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#455A64',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  message: { color: '#B3E5FC', marginTop: 14, textAlign: 'center' },
  close: { color: '#90CAF9', textAlign: 'center', marginTop: 20, fontWeight: '700' },
});
