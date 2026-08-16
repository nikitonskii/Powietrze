import {
  render,
  screen,
  within,
  fireEvent,
} from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';
import { SettingsProvider } from '../../../shared/settings';
import {
  DEFAULT_SETTINGS,
  type Settings,
  type SettingsStore,
} from '../../../core/settings';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
} from '../../../shared/place';
import { RefreshProvider } from '../../../shared/refresh';
import type { AirQualitySource, ReadingDetail } from '../../../core/air';
import { usAqiFromPm25 } from '../../../core/air';
import {
  fakeAirSource,
  pendingAirSource,
} from '../../../shared/test/fakeAirSource';

// The RN jest preset's RefreshControl mock renders a bare host node and
// drops every prop (including testID), so the real one is unqueryable.
// Forward the props we need to assert wiring (testID/refreshing/onRefresh).
jest.mock(
  'react-native/Libraries/Components/RefreshControl/RefreshControl',
  () => {
    // Require the View submodule directly (already mocked by the RN jest
    // preset) — going through the 'react-native' index would re-import this
    // very module and create a circular reference.
    const View = require('react-native/Libraries/Components/View/View').default;
    function RefreshControl(props: {
      testID?: string;
      refreshing: boolean;
      onRefresh?: () => void;
    }) {
      return (
        <View
          testID={props.testID}
          accessibilityState={{ busy: props.refreshing }}
          onPress={props.onRefresh}
        />
      );
    }
    // react-native/index.js reads `require(path).default` directly (no
    // babel interop), so the mock must expose an explicit default export.
    return { __esModule: true, default: RefreshControl };
  },
);

const detail: ReadingDetail = {
  history: [
    { at: 'a', pm25: 10, index: 10 },
    { at: 'b', pm25: 20, index: 20 },
  ],
  pollutants: [
    { code: 'PM10', value: 40 },
    { code: 'NO2', value: 22 },
  ],
};
const detailedSource = (): AirQualitySource => ({
  ...fakeAirSource(),
  getDetail: async () => detail,
});

const settingsStore = (s: Settings = DEFAULT_SETTINGS): SettingsStore => ({
  load: async () => s,
  save: async () => {},
});

const wrap = (src: () => AirQualitySource, s: Settings = DEFAULT_SETTINGS) =>
  render(
    <RefreshProvider>
      <SettingsProvider store={settingsStore(s)}>
        <PlaceSourceProvider sourceForPlace={src}>
          <ActivePlaceProvider>
            <TerazScreen />
          </ActivePlaceProvider>
        </PlaceSourceProvider>
      </SettingsProvider>
    </RefreshProvider>,
  );

test('spec-002 AC-8: renders the live reading — index, band, city, real pm25, atmosphere', async () => {
  await wrap(() => fakeAirSource());
  const gradient = await screen.findByTestId('gradient-background');
  expect(within(gradient).getByText('118')).toBeTruthy();
  expect(within(gradient).getByText('Zły')).toBeTruthy();
  expect(within(gradient).getByText('Kraków')).toBeTruthy();
  expect(within(gradient).getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
  expect(within(gradient).getByText('TWOJA LOKALIZACJA')).toBeTruthy();
  expect(within(gradient).getByTestId('atmosphere')).toBeTruthy();
});

test('spec-002 AC-8: shows a loading state while the source is pending', async () => {
  await wrap(() => pendingAirSource());
  expect(await screen.findByTestId('teraz-loading')).toBeTruthy();
});

test('AC-10: with detail → chart + tiles render below the hero', async () => {
  await wrap(detailedSource);
  const g = await screen.findByTestId('gradient-background');
  expect(within(g).getByText('118')).toBeTruthy(); // hero still there
  expect(await within(g).findByText('OSTATNIE 24 GODZINY')).toBeTruthy(); // chart
  expect(within(g).getByText('PM10')).toBeTruthy(); // tiles
  expect(within(g).getByText('NO₂')).toBeTruthy();
});

test('AC-10: without detail (getCurrentReading only) → hero, no chart/tiles', async () => {
  await wrap(() => fakeAirSource());
  await screen.findByText('118');
  expect(screen.queryByText('OSTATNIE 24 GODZINY')).toBeNull();
});

test('AC-5,5b: scale µg/m³ → hero number is the formatted concentration, no PM2.5 sub-line', async () => {
  await wrap(() => fakeAirSource(), {
    ...DEFAULT_SETTINGS,
    scale: 'µg/m³',
    precision: 'Dokładna',
  });
  const gradient = await screen.findByTestId('gradient-background');
  expect(within(gradient).getByText('122.0')).toBeTruthy();
  expect(within(gradient).queryByText(/PM2.5 ·/)).toBeNull();
  expect(within(gradient).getByText('Zły')).toBeTruthy(); // color/band unaffected
});

test('AC-5,7: scale US AQI → hero number is usAqiFromPm25(pm25)', async () => {
  await wrap(() => fakeAirSource(), {
    ...DEFAULT_SETTINGS,
    scale: 'US AQI',
  });
  const gradient = await screen.findByTestId('gradient-background');
  expect(within(gradient).getByText(String(usAqiFromPm25(122)))).toBeTruthy();
  expect(within(gradient).getByText('Zły')).toBeTruthy(); // band stays scene(reading.index)
});

test('AC-5,6 (refresh): ScrollView carries a RefreshControl wired to useRefresh()', async () => {
  let calls = 0;
  const countingSource = (): AirQualitySource => ({
    getCurrentReading: () => {
      calls++;
      return fakeAirSource().getCurrentReading();
    },
  });
  await wrap(() => countingSource());
  await screen.findByTestId('gradient-background');
  expect(calls).toBe(1);
  expect(
    screen.getByTestId('refresh-control').props.accessibilityState.busy,
  ).toBe(false); // no refresh in flight yet

  // Pull-to-refresh: the RefreshControl's onRefresh is useRefresh().refresh —
  // firing it re-triggers the active place's fetch (proves the wiring).
  await fireEvent.press(screen.getByTestId('refresh-control'));
  expect(calls).toBe(2);
  // The active fetch settled within the same act() flush → refreshing is
  // back to false (ActivePlaceProvider's settleActive cleared it).
  expect(
    screen.getByTestId('refresh-control').props.accessibilityState.busy,
  ).toBe(false);
});
