import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../PlaceSourceContext';
import { usePlaceReading } from '../usePlaceReading';
import { LOCATION_PLACE } from '../../../core/places';
import type { Reading } from '../../../core/air';

const READING: Reading = {
  index: 42,
  pm25: 43,
  measuredAt: '2026-08-11 21:00:00',
  city: 'Warszawa',
  station: 'x',
};

function Probe() {
  const s = usePlaceReading(LOCATION_PLACE);
  return <Text>{`${s.status}:${s.reading?.index ?? '-'}`}</Text>;
}
const wrap = (sourceForPlace: SourceForPlace) =>
  render(
    <PlaceSourceProvider sourceForPlace={sourceForPlace}>
      <Probe />
    </PlaceSourceProvider>,
  );

test('AC 006-6/6b: starts in loading until the first reading resolves', async () => {
  // A source that never resolves keeps the hook in its initial loading state.
  await wrap(() => ({
    getCurrentReading: () => new Promise<Reading>(() => {}),
  }));
  expect(screen.getByText('loading:-')).toBeTruthy();
});

test('AC 006-6b: resolves to ready and exposes the reading', async () => {
  await wrap(() => ({ getCurrentReading: () => Promise.resolve(READING) }));
  await waitFor(() => expect(screen.getByText('ready:42')).toBeTruthy());
});

test('AC 006-6b: a rejecting source becomes stale, no reading, no throw', async () => {
  await wrap(() => ({
    getCurrentReading: () => Promise.reject(new Error('net')),
  }));
  await waitFor(() => expect(screen.getByText('stale:-')).toBeTruthy());
});
