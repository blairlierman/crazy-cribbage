const storage = new Map<string, string>();
const mockWriteAsStringAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
let mockPlatformOS: 'web' | 'ios' = 'web';
let firstSetItemBlocked = false;
let releaseFirstSetItem: (() => void) | null = null;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      if (firstSetItemBlocked) {
        await new Promise<void>((resolve) => {
          releaseFirstSetItem = resolve;
        });
        firstSetItemBlocked = false;
      }
      storage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  documentDirectory: 'file:///documents/',
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

async function waitForFirstSetItemToBlock() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (releaseFirstSetItem) {
      return;
    }
    await Promise.resolve();
  }
  throw new Error('Timed out waiting for the first trace write to block.');
}

describe('trace log', () => {
  beforeEach(() => {
    storage.clear();
    mockWriteAsStringAsync.mockReset();
    mockIsAvailableAsync.mockReset();
    mockShareAsync.mockReset();
    mockPlatformOS = 'web';
    firstSetItemBlocked = false;
    releaseFirstSetItem = null;
    jest.resetModules();
  });

  it('serializes concurrent appends so events are not lost', async () => {
    firstSetItemBlocked = true;

    const { appendTraceEvent, loadTraceEvents } = await import('../src/store/traceLog');
    const firstAppend = appendTraceEvent('start_run', { mode: 'classic' });
    const secondAppend = appendTraceEvent('show_round_complete');

    await waitForFirstSetItemToBlock();
    releaseFirstSetItem?.();

    await Promise.all([firstAppend, secondAppend]);

    await expect(loadTraceEvents()).resolves.toMatchObject([
      { type: 'start_run', details: { mode: 'classic' } },
      { type: 'show_round_complete' },
    ]);
  });

  it('clears stored trace events', async () => {
    const { appendTraceEvent, clearTraceEvents, loadTraceEvents } =
      await import('../src/store/traceLog');

    await appendTraceEvent('start_run');
    await clearTraceEvents();

    await expect(loadTraceEvents()).resolves.toEqual([]);
  });

  it('does not repopulate storage when clear follows a pending append', async () => {
    firstSetItemBlocked = true;

    const { appendTraceEvent, clearTraceEvents, loadTraceEvents } =
      await import('../src/store/traceLog');
    const append = appendTraceEvent('start_run');
    const clear = clearTraceEvents();

    await waitForFirstSetItemToBlock();
    releaseFirstSetItem?.();

    await Promise.all([append, clear]);

    await expect(loadTraceEvents()).resolves.toEqual([]);
  });

  it('checks native sharing availability before writing a file', async () => {
    mockPlatformOS = 'ios';
    mockIsAvailableAsync.mockResolvedValue(false);

    const { exportTraceEvents } = await import('../src/store/traceLog');

    await expect(exportTraceEvents([])).rejects.toThrow('Sharing is not available on this device.');
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
