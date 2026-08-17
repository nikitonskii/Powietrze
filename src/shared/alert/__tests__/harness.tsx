import { render } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import type { ReactNode } from 'react';
import { SmogAlertProvider } from '..';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
  useActivePlace,
  type SourceForPlace,
} from '../../place';
import { SettingsProvider, useSettings } from '../../settings';
import { RefreshProvider, useRefresh } from '../../refresh';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';
import type { Notifier } from '../../../core/notifications';

// Shared fixtures + render harness for SmogAlertProvider's AC-4 test suite
// (split across crossing/perPlace/permission.test.tsx — CLAUDE.md ≤200 lines).

export const store = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

export const fakeNotifier = (
  granted = true,
): Notifier & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    requestPermission: async () => {
      calls.push('req');
      return granted;
    },
    scheduleMorning: async () => {
      calls.push('sched');
    },
    cancelMorning: async () => {
      calls.push('cancel');
    },
    notifySmog: jest.fn(async (index: number) => {
      calls.push(`smog:${index}`);
    }),
  };
};

export const station = (id: number, city: string): Station => ({
  id,
  name: `Station ${id}`,
  city,
  lat: 0,
  lon: 0,
});
export const stationA = station(1, 'A');
export const stationB = station(2, 'B');

export const reading = (index: number, city = 'A'): Reading => ({
  index,
  pm25: 0,
  measuredAt: '2026-08-16 12:00:00',
  city,
  station: `Station ${city}`,
});

// DAY is outside the 22:00-07:00 quiet window; NIGHT is inside it.
export const DAY = () => new Date('2026-08-16T12:00:00');
export const NIGHT = () => new Date('2026-08-16T23:00:00');

// location kind → 0 (safely below any test threshold) so the transient
// `location` place ActivePlaceProvider briefly holds before settings
// hydrate (`loc` defaults true) never spuriously crosses a threshold.
export function fixedSource(
  indexByStationId: Record<number, number>,
): SourceForPlace {
  return place => ({
    getCurrentReading: () =>
      Promise.resolve(
        reading(
          place.kind === 'station' ? indexByStationId[place.station.id] : 0,
          place.kind === 'station' ? place.station.city : 'loc',
        ),
      ),
  });
}

// Exposes `status` + a `refresh` trigger with its `refreshing` state, so
// tests can deterministically wait for a reading (incl. a stale settle) to
// finish instead of an arbitrary timer flush.
export function AlertControls() {
  const { status } = useActivePlace();
  const { refresh, refreshing } = useRefresh();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="refreshing">{refreshing ? 'true' : 'false'}</Text>
      <Pressable testID="refresh" onPress={refresh}>
        <Text>refresh</Text>
      </Pressable>
    </>
  );
}

export function AlertToggle() {
  const { set } = useSettings();
  return (
    <Pressable testID="toggle-alert" onPress={() => set('alert', true)}>
      <Text>toggle</Text>
    </Pressable>
  );
}

export function PlacePicker() {
  const { setActive } = useActivePlace();
  return (
    <>
      <Pressable
        testID="pick-a"
        onPress={() => setActive({ kind: 'station', station: stationA })}
      >
        <Text>a</Text>
      </Pressable>
      <Pressable
        testID="pick-b"
        onPress={() => setActive({ kind: 'station', station: stationB })}
      >
        <Text>b</Text>
      </Pressable>
    </>
  );
}

// Wires PlaceSourceProvider → SettingsProvider → ActivePlaceProvider →
// SmogAlertProvider, optionally under RefreshProvider (needed to force a
// real refetch for the SAME place — crossing/re-cross/stale cases).
export function renderAlert(opts: {
  notifier: Notifier;
  now?: () => Date;
  settings?: Partial<Settings>;
  settingsStore?: SettingsStore;
  sourceForPlace: SourceForPlace;
  defaultStation?: Station;
  children?: ReactNode;
  withRefresh?: boolean;
}) {
  const {
    notifier,
    now = DAY,
    settings = {},
    settingsStore,
    sourceForPlace,
    defaultStation = stationA,
    children = <Text>x</Text>,
    withRefresh = false,
  } = opts;
  const resolvedStore =
    settingsStore ?? store({ ...DEFAULT_SETTINGS, loc: false, ...settings });
  const tree = (
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <SettingsProvider store={resolvedStore}>
        <ActivePlaceProvider defaultStation={defaultStation}>
          <SmogAlertProvider notifier={notifier} now={now}>
            {children}
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>
  );
  return render(withRefresh ? <RefreshProvider>{tree}</RefreshProvider> : tree);
}
