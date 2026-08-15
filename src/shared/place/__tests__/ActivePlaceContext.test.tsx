import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../PlaceSourceContext';
import { ActivePlaceProvider, useActivePlace } from '../ActivePlaceContext';
import { SettingsProvider, useSettings } from '../../settings';
import type { Station } from '../../../core/geo';
import type { Reading } from '../../../core/air';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';

const store = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

const warsaw: Station = {
  id: 530,
  name: 'Warszawa, Al. Niepodległości',
  city: 'Warszawa',
  lat: 0,
  lon: 0,
};
const rLoc: Reading = {
  index: 4,
  pm25: 5,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'x',
};
const rWaw: Reading = {
  index: 42,
  pm25: 43,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Warszawa',
  station: 'y',
};

const sourceForPlace: SourceForPlace = place => ({
  getCurrentReading: () =>
    Promise.resolve(place.kind === 'location' ? rLoc : rWaw),
});

function Probe() {
  const { active, setActive, reading } = useActivePlace();
  return (
    <>
      <Text>{`${active.kind}:${reading?.city ?? '-'}:${
        reading?.index ?? '-'
      }`}</Text>
      <Pressable
        testID="pick"
        onPress={() => setActive({ kind: 'station', station: warsaw })}
      >
        <Text>pick</Text>
      </Pressable>
    </>
  );
}

test('AC 006-6: defaults to location, then setActive switches the reading', async () => {
  render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <SettingsProvider store={store()}>
        <ActivePlaceProvider>
          <Probe />
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('location:Kraków:4')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('pick'));
  await waitFor(() =>
    expect(screen.getByText('station:Warszawa:42')).toBeTruthy(),
  );
});

test('AC-6: defaultStation is used when loc setting is off', async () => {
  render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <SettingsProvider store={store({ ...DEFAULT_SETTINGS, loc: false })}>
        <ActivePlaceProvider defaultStation={warsaw}>
          <Probe />
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('station:Warszawa:42')).toBeTruthy(),
  );
});

test('AC-6: defaultStation is ignored when loc setting is on', async () => {
  render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <SettingsProvider store={store({ ...DEFAULT_SETTINGS, loc: true })}>
        <ActivePlaceProvider defaultStation={warsaw}>
          <Probe />
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('location:Kraków:4')).toBeTruthy(),
  );
});

function LocToggle() {
  const { set } = useSettings();
  return (
    <Pressable testID="toggle-loc" onPress={() => set('loc', false)}>
      <Text>toggle</Text>
    </Pressable>
  );
}

test('AC-6: turning loc off resets active to the default station', async () => {
  render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <SettingsProvider store={store({ ...DEFAULT_SETTINGS, loc: true })}>
        <ActivePlaceProvider defaultStation={warsaw}>
          <Probe />
          <LocToggle />
        </ActivePlaceProvider>
      </SettingsProvider>
    </PlaceSourceProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText('location:Kraków:4')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('toggle-loc'));
  await waitFor(() =>
    expect(screen.getByText('station:Warszawa:42')).toBeTruthy(),
  );
});
