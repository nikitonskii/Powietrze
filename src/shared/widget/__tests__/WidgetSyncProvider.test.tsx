import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { WidgetSyncProvider } from '..';
import { buildWidgetSnapshot, type WidgetSync } from '../../../core/widget';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../../place/PlaceSourceContext';
import { ActivePlaceProvider } from '../../place/ActivePlaceContext';
import { SettingsProvider, useSettings } from '../../settings';
import type { Reading, ReadingDetail } from '../../../core/air';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';

const store = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

const READING: Reading = {
  index: 63,
  pm25: 65,
  measuredAt: '2026-08-15 12:00:00',
  city: 'Kraków',
  station: 'Aleja Krasińskiego',
};
const DETAIL: ReadingDetail = {
  history: [],
  pollutants: [
    { code: 'PM10', value: 13 },
    { code: 'NO2', value: 29 },
  ],
};

const readySource: SourceForPlace = () => ({
  getCurrentReading: () => Promise.resolve(READING),
  getDetail: () => Promise.resolve(DETAIL),
});

const loadingSource: SourceForPlace = () => ({
  getCurrentReading: () => new Promise<Reading>(() => {}), // never resolves
});

const fakeSync = (): WidgetSync & { publish: jest.Mock } => ({
  publish: jest.fn(),
});

function ScaleToggle() {
  const { set } = useSettings();
  return (
    <Pressable testID="toggle-scale" onPress={() => set('scale', 'µg/m³')}>
      <Text>toggle</Text>
    </Pressable>
  );
}

const tree = (source: SourceForPlace, sync: WidgetSync, settings: Settings) => (
  <PlaceSourceProvider sourceForPlace={source}>
    <SettingsProvider store={store(settings)}>
      <ActivePlaceProvider>
        <WidgetSyncProvider sync={sync}>
          <ScaleToggle />
          <Text>x</Text>
        </WidgetSyncProvider>
      </ActivePlaceProvider>
    </SettingsProvider>
  </PlaceSourceProvider>
);

const wrap = (
  source: SourceForPlace,
  sync: WidgetSync,
  settings: Settings = DEFAULT_SETTINGS,
) => render(tree(source, sync, settings));

test('AC-3: publishes once when the reading becomes ready, with the built snapshot', async () => {
  const sync = fakeSync();
  await wrap(readySource, sync);
  await waitFor(() => expect(sync.publish).toHaveBeenCalledTimes(1));
  expect(sync.publish).toHaveBeenCalledWith(
    buildWidgetSnapshot(
      READING,
      DETAIL,
      DEFAULT_SETTINGS.scale,
      DEFAULT_SETTINGS.precision,
    ),
  );
});

test('AC-3: an unrelated re-render with unchanged reading/settings does not republish', async () => {
  const sync = fakeSync();
  const utils = await wrap(readySource, sync);
  await waitFor(() => expect(sync.publish).toHaveBeenCalledTimes(1));
  await utils.rerender(tree(readySource, sync, DEFAULT_SETTINGS));
  expect(sync.publish).toHaveBeenCalledTimes(1);
});

test('AC-3: changing scale republishes with the updated snapshot', async () => {
  const sync = fakeSync();
  const utils = await wrap(readySource, sync);
  await waitFor(() => expect(sync.publish).toHaveBeenCalledTimes(1));
  fireEvent.press(utils.getByTestId('toggle-scale'));
  await waitFor(() => expect(sync.publish).toHaveBeenCalledTimes(2));
  expect(sync.publish).toHaveBeenLastCalledWith(
    buildWidgetSnapshot(READING, DETAIL, 'µg/m³', DEFAULT_SETTINGS.precision),
  );
});

test('AC-3: no publish while the reading is not ready', async () => {
  const sync = fakeSync();
  await wrap(loadingSource, sync);
  expect(sync.publish).not.toHaveBeenCalled();
});
