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
