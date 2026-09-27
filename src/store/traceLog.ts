import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface TraceEvent {
  timestamp: string;
  type: string;
  details?: object;
}

const STORAGE_KEY = '@crazy-cribbage/trace-log';
const MAX_EVENTS = 2000;
let appendQueue = Promise.resolve();

export async function loadTraceEvents(): Promise<TraceEvent[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const events = JSON.parse(stored) as unknown;
    return Array.isArray(events) ? (events as TraceEvent[]) : [];
  } catch {
    return [];
  }
}

export async function appendTraceEvent(type: string, details?: object): Promise<TraceEvent> {
  const event: TraceEvent = { timestamp: new Date().toISOString(), type, details };
  const write = appendQueue.then(async () => {
    const events = [...(await loadTraceEvents()), event].slice(-MAX_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return event;
  });
  appendQueue = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

export async function clearTraceEvents(): Promise<void> {
  const clear = appendQueue.then(() => AsyncStorage.removeItem(STORAGE_KEY));
  appendQueue = clear.then(
    () => undefined,
    () => undefined,
  );
  await clear;
}

export function traceText(events: TraceEvent[]): string {
  return JSON.stringify(
    {
      app: 'crazy-cribbage',
      exportedAt: new Date().toISOString(),
      events,
    },
    null,
    2,
  );
}

export async function exportTraceEvents(events: TraceEvent[]): Promise<void> {
  const contents = traceText(events);
  const filename = `crazy-cribbage-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (!FileSystem.documentDirectory) {
    throw new Error('No writable document directory is available.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  const path = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, contents);
  await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Share trace log' });
}
