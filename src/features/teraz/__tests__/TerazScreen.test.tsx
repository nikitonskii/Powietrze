import { render, screen, within } from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';
import {
  PlaceSourceProvider,
  ActivePlaceProvider,
} from '../../../shared/place';
import type { AirQualitySource, ReadingDetail } from '../../../core/air';
import {
  fakeAirSource,
  pendingAirSource,
} from '../../../shared/test/fakeAirSource';

const detail: ReadingDetail = {
  history: [
    { at: 'a', pm25: 10, index: 10 },
    { at: 'b', pm25: 20, index: 20 },
  ],
  pm10: 40,
  no2: 22,
};
const detailedSource = (): AirQualitySource => ({
  ...fakeAirSource(),
  getDetail: async () => detail,
});

const wrap = (src: () => AirQualitySource) =>
  render(
    <PlaceSourceProvider sourceForPlace={src}>
      <ActivePlaceProvider>
        <TerazScreen />
      </ActivePlaceProvider>
    </PlaceSourceProvider>,
  );

test('AC-8: renders the live reading — index, band, city, real pm25, atmosphere', async () => {
  await wrap(() => fakeAirSource());
  const gradient = await screen.findByTestId('gradient-background');
  expect(within(gradient).getByText('118')).toBeTruthy();
  expect(within(gradient).getByText('Zły')).toBeTruthy();
  expect(within(gradient).getByText('Kraków')).toBeTruthy();
  expect(within(gradient).getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
  expect(within(gradient).getByText('TWOJA LOKALIZACJA')).toBeTruthy();
  expect(within(gradient).getByTestId('atmosphere')).toBeTruthy();
});

test('AC-8: shows a loading state while the source is pending', async () => {
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
