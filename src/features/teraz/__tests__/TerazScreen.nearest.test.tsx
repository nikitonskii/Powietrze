import { render, screen } from '@testing-library/react-native';
import { TerazScreen } from '../TerazScreen';
import { AirSourceProvider } from '../AirSourceContext';
import type { AirQualitySource, Reading } from '../../../core/air';

const warsawReading: Reading = {
  index: 42,
  pm25: 43,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Warszawa',
  station: 'Al. Niepodległości · stacja GIOŚ',
};

test('AC 005-7: TerazScreen renders the resolved (non-Kraków) city + index', async () => {
  const source: AirQualitySource = {
    getCurrentReading: async () => warsawReading,
  };
  await render(
    <AirSourceProvider source={source}>
      <TerazScreen />
    </AirSourceProvider>,
  );
  expect(await screen.findByText('Warszawa')).toBeTruthy();
  expect(screen.getByText('42')).toBeTruthy();
});

test('AC 005-7: TerazScreen shows the loading state while the reading is pending', async () => {
  // A source that never resolves keeps the screen in its loading state.
  const pending: AirQualitySource = {
    getCurrentReading: () => new Promise<Reading>(() => {}),
  };
  await render(
    <AirSourceProvider source={pending}>
      <TerazScreen />
    </AirSourceProvider>,
  );
  expect(screen.getByTestId('teraz-loading')).toBeTruthy();
  expect(screen.queryByText('Kraków')).toBeNull(); // no hardcoded fallback content
});
