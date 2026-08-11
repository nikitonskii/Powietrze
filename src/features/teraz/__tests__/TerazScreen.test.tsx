import { render, screen, within } from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';
import { AirSourceProvider } from '../AirSourceContext';
import {
  fakeAirSource,
  pendingAirSource,
} from '../../../shared/test/fakeAirSource';

test('AC-8: renders the live reading — index, band, city, real pm25, atmosphere', async () => {
  await render(
    <AirSourceProvider source={fakeAirSource()}>
      <TerazScreen />
    </AirSourceProvider>,
  );
  const gradient = await screen.findByTestId('gradient-background');
  expect(within(gradient).getByText('118')).toBeTruthy();
  expect(within(gradient).getByText('Zły')).toBeTruthy();
  expect(within(gradient).getByText('Kraków')).toBeTruthy();
  expect(within(gradient).getByText('PM2.5 · 122 µg/m³')).toBeTruthy();
  expect(within(gradient).getByTestId('atmosphere')).toBeTruthy();
});

test('AC-8: shows a loading state while the source is pending', async () => {
  await render(
    <AirSourceProvider source={pendingAirSource()}>
      <TerazScreen />
    </AirSourceProvider>,
  );
  expect(await screen.findByTestId('teraz-loading')).toBeTruthy();
});
