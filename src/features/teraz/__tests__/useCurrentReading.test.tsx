import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AirSourceProvider } from '../AirSourceContext';
import { useCurrentReading } from '../useCurrentReading';
import type { AirQualitySource, Reading } from '../../../core/air';

const READING: Reading = {
  index: 118,
  pm25: 122,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Kraków',
  station: 'Aleja Krasińskiego · stacja GIOŚ',
};

function Probe() {
  const s = useCurrentReading();
  return <Text>{`${s.status}:${s.reading?.index ?? '-'}`}</Text>;
}

const wrap = (source: AirQualitySource) =>
  render(
    <AirSourceProvider source={source}>
      <Probe />
    </AirSourceProvider>,
  );

test('AC-7: resolves to ready and exposes the reading', async () => {
  await wrap({ getCurrentReading: () => Promise.resolve(READING) });
  await waitFor(() => expect(screen.getByText('ready:118')).toBeTruthy());
});

test('AC-7: rejection becomes stale without throwing', async () => {
  await wrap({ getCurrentReading: () => Promise.reject(new Error('net')) });
  await waitFor(() => expect(screen.getByText('stale:-')).toBeTruthy());
});
