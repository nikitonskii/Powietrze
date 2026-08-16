import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
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

const store = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

const fakeNotifier = (granted = true): Notifier & { calls: string[] } => {
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

const station = (id: number, city: string): Station => ({
  id,
  name: `Station ${id}`,
  city,
  lat: 0,
  lon: 0,
});
const stationA = station(1, 'A');
const stationB = station(2, 'B');

const reading = (index: number, city = 'A'): Reading => ({
  index,
  pm25: 0,
  measuredAt: '2026-08-16 12:00:00',
  city,
  station: `Station ${city}`,
});

// DAY is outside the 22:00-07:00 quiet window; NIGHT is inside it.
const DAY = () => new Date('2026-08-16T12:00:00');
const NIGHT = () => new Date('2026-08-16T23:00:00');

function fixedSource(indexByStationId: Record<number, number>): SourceForPlace {
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

function RefreshButton() {
  const { refresh } = useRefresh();
  return (
    <Pressable testID="refresh" onPress={refresh}>
      <Text>refresh</Text>
    </Pressable>
  );
}

function AlertToggle() {
  const { set } = useSettings();
  return (
    <Pressable testID="toggle-alert" onPress={() => set('alert', true)}>
      <Text>toggle</Text>
    </Pressable>
  );
}

function PlacePicker() {
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

test('AC-4: fires notifySmog once on a rising crossing', async () => {
  const n = fakeNotifier();
  await render(
    <PlaceSourceProvider sourceForPlace={fixedSource({ 1: 80 })}>
      <SettingsProvider
        store={store({
          ...DEFAULT_SETTINGS,
          loc: false,
          alert: true,
          threshold: 50,
        })}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={DAY}>
            <Text>x</Text>
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));
  expect(n.notifySmog).toHaveBeenCalledWith(80);
});

test('AC-4: does not fire below threshold', async () => {
  const n = fakeNotifier();
  await render(
    <PlaceSourceProvider sourceForPlace={fixedSource({ 1: 10 })}>
      <SettingsProvider
        store={store({
          ...DEFAULT_SETTINGS,
          loc: false,
          alert: true,
          threshold: 50,
        })}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={DAY}>
            <Text>x</Text>
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await new Promise(r => setTimeout(r, 0));
  expect(n.notifySmog).not.toHaveBeenCalled();
});

test('AC-4: does not fire when alert is off', async () => {
  const n = fakeNotifier();
  await render(
    <PlaceSourceProvider sourceForPlace={fixedSource({ 1: 80 })}>
      <SettingsProvider
        store={store({ ...DEFAULT_SETTINGS, alert: false, threshold: 50 })}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={DAY}>
            <Text>x</Text>
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await new Promise(r => setTimeout(r, 0));
  expect(n.notifySmog).not.toHaveBeenCalled();
});

test('AC-4: does not fire during quiet hours', async () => {
  const n = fakeNotifier();
  await render(
    <PlaceSourceProvider sourceForPlace={fixedSource({ 1: 80 })}>
      <SettingsProvider
        store={store({
          ...DEFAULT_SETTINGS,
          loc: false,
          alert: true,
          threshold: 50,
        })}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={NIGHT}>
            <Text>x</Text>
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await new Promise(r => setTimeout(r, 0));
  expect(n.notifySmog).not.toHaveBeenCalled();
});

test('AC-4: does not fire while status is not ready (pending fetch)', async () => {
  const n = fakeNotifier();
  let resolveReading: ((r: Reading) => void) | undefined;
  const pendingSource: SourceForPlace = () => ({
    getCurrentReading: () =>
      new Promise<Reading>(resolve => {
        resolveReading = resolve;
      }),
  });
  render(
    <PlaceSourceProvider sourceForPlace={pendingSource}>
      <SettingsProvider
        store={store({
          ...DEFAULT_SETTINGS,
          loc: false,
          alert: true,
          threshold: 50,
        })}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={DAY}>
            <Text>x</Text>
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await new Promise(r => setTimeout(r, 0));
  expect(n.notifySmog).not.toHaveBeenCalled();
  await act(async () => {
    resolveReading?.(reading(80));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));
});

test('AC-4: staying above threshold on refetch does not re-fire; dropping below then re-crossing fires again', async () => {
  const n = fakeNotifier();
  let index = 80;
  const source: SourceForPlace = place => ({
    getCurrentReading: () =>
      Promise.resolve(reading(place.kind === 'station' ? index : 0)),
  });
  const { getByTestId } = await render(
    <RefreshProvider>
      <PlaceSourceProvider sourceForPlace={source}>
        <SettingsProvider
          store={store({
            ...DEFAULT_SETTINGS,
            loc: false,
            alert: true,
            threshold: 50,
          })}
        >
          <ActivePlaceProvider defaultStation={stationA}>
            <SmogAlertProvider notifier={n} now={DAY}>
              <RefreshButton />
            </SmogAlertProvider>
          </ActivePlaceProvider>
        </SettingsProvider>
      </PlaceSourceProvider>
    </RefreshProvider>,
  );
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));

  // Refetch while still above threshold: must NOT re-fire.
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));

  // Drop below threshold, refetch: no fire, but wasAbove resets.
  index = 10;
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await new Promise(r => setTimeout(r, 0));
  expect(n.notifySmog).toHaveBeenCalledTimes(1);

  // Re-cross: fires again.
  index = 80;
  await act(async () => {
    fireEvent.press(getByTestId('refresh'));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(2));
});

test('AC-4 (S2): per-place dedup — switching away and back does not re-fire; a distinct place fires on its own', async () => {
  const n = fakeNotifier();
  const { getByTestId } = await render(
    <PlaceSourceProvider sourceForPlace={fixedSource({ 1: 80, 2: 90 })}>
      <SettingsProvider
        store={store({
          ...DEFAULT_SETTINGS,
          loc: false,
          alert: true,
          threshold: 50,
        })}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={DAY}>
            <PlacePicker />
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );

  // Place A (>= threshold) fires once.
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(1));
  expect(n.notifySmog).toHaveBeenLastCalledWith(80);

  // Switch to B (>= threshold): fires for B.
  await act(async () => {
    fireEvent.press(getByTestId('pick-b'));
  });
  await waitFor(() => expect(n.notifySmog).toHaveBeenCalledTimes(2));
  expect(n.notifySmog).toHaveBeenLastCalledWith(90);

  // Switch back to A (still >= threshold): must NOT re-fire A.
  await act(async () => {
    fireEvent.press(getByTestId('pick-a'));
  });
  await new Promise(r => setTimeout(r, 0));
  expect(n.notifySmog).toHaveBeenCalledTimes(2);
});

test('AC-4: toggling alert on requests permission; denied reverts the setting', async () => {
  const saved: Settings[] = [];
  const n = fakeNotifier(false);
  const { getByTestId } = await render(
    <PlaceSourceProvider sourceForPlace={fixedSource({ 1: 10 })}>
      <SettingsProvider
        store={{
          load: async () => ({
            ...DEFAULT_SETTINGS,
            loc: false,
            alert: false,
          }),
          save: async x => {
            saved.push(x);
          },
        }}
      >
        <ActivePlaceProvider defaultStation={stationA}>
          <SmogAlertProvider notifier={n} now={DAY}>
            <AlertToggle />
          </SmogAlertProvider>
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await act(async () => {
    fireEvent.press(getByTestId('toggle-alert'));
  });
  await waitFor(() => expect(n.calls).toContain('req'));
  await waitFor(() => expect(saved.at(-1)?.alert).toBe(false));
});
