import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '..';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';

const fakeStore = (initial: Settings = DEFAULT_SETTINGS) => {
  const saved: Settings[] = [];
  const store: SettingsStore = {
    load: async () => initial,
    save: async s => {
      saved.push(s);
    },
  };
  return { store, saved };
};
const wrap = (store: SettingsStore) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SettingsProvider store={store}>{children}</SettingsProvider>;
  };

// renderHook (v14) resolves only once pending effects/microtasks settle, so a
// synchronously-resolving fake store would already be hydrated by the time
// `await renderHook(...)` returns. A deferred load lets us observe the real
// pre-hydration state before resolving it under `act`.
test('AC-10: starts at DEFAULT_SETTINGS then hydrates from store', async () => {
  let resolveLoad!: (s: Settings) => void;
  const loadPromise = new Promise<Settings>(resolve => {
    resolveLoad = resolve;
  });
  const store: SettingsStore = {
    load: () => loadPromise,
    save: async () => {},
  };
  const { result } = await renderHook(() => useSettings(), {
    wrapper: wrap(store),
  });
  expect(result.current.settings).toEqual(DEFAULT_SETTINGS); // pre-hydration

  await act(() => resolveLoad({ ...DEFAULT_SETTINGS, alert: false }));
  expect(result.current.settings.alert).toBe(false); // hydrated
});

test('AC-11: set updates state and persists the full settings', async () => {
  const { store, saved } = fakeStore();
  const { result } = await renderHook(() => useSettings(), {
    wrapper: wrap(store),
  });
  await waitFor(() =>
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS),
  );
  await act(() => result.current.set('alert', false));
  expect(result.current.settings.alert).toBe(false);
  expect(saved.at(-1)).toEqual({ ...DEFAULT_SETTINGS, alert: false });
});

test('AC-12: successive set calls compose (functional updater)', async () => {
  const { store, saved } = fakeStore();
  const { result } = await renderHook(() => useSettings(), {
    wrapper: wrap(store),
  });
  await waitFor(() =>
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS),
  );
  await act(() => {
    result.current.set('alert', false);
    result.current.set('morning', true);
  });
  expect(result.current.settings.alert).toBe(false);
  expect(result.current.settings.morning).toBe(true);
  expect(saved.at(-1)).toEqual({
    ...DEFAULT_SETTINGS,
    alert: false,
    morning: true,
  });
});
