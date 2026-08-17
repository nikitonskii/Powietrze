import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../PlaceSourceContext';
import { usePlaceReading } from '../usePlaceReading';
import { LOCATION_PLACE } from '../../../core/places';
import type { Reading } from '../../../core/air';
import { RefreshProvider, useRefresh } from '../../refresh';

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

function RefreshHarness() {
  const { refresh } = useRefresh();
  const [tick, setTick] = useState(0);
  usePlaceReading(LOCATION_PLACE);
  return (
    <>
      <Text>{`tick:${tick}`}</Text>
      <Pressable testID="refresh-btn" onPress={refresh}>
        <Text>refresh</Text>
      </Pressable>
      <Pressable testID="rerender-btn" onPress={() => setTick(n => n + 1)}>
        <Text>rerender</Text>
      </Pressable>
    </>
  );
}

test('AC-2: usePlaceReading refetches when the signal bumps, not on an unrelated re-render', async () => {
  let calls = 0;
  const sourceForPlace: SourceForPlace = () => ({
    getCurrentReading: () => {
      calls += 1;
      return Promise.resolve(READING);
    },
  });

  await render(
    <RefreshProvider>
      <PlaceSourceProvider sourceForPlace={sourceForPlace}>
        <RefreshHarness />
      </PlaceSourceProvider>
    </RefreshProvider>,
  );
  await waitFor(() => expect(calls).toBe(1));

  await fireEvent.press(screen.getByTestId('refresh-btn'));
  await waitFor(() => expect(calls).toBe(2));

  // A re-render that leaves the signal unchanged must not refetch.
  await fireEvent.press(screen.getByTestId('rerender-btn'));
  expect(screen.getByText('tick:1')).toBeTruthy();
  expect(calls).toBe(2);
});

test('AC-2: unwrapped (no RefreshProvider) — usePlaceReading still works, 1 call, no throw', async () => {
  let calls = 0;
  await wrap(() => ({
    getCurrentReading: () => {
      calls += 1;
      return Promise.resolve(READING);
    },
  }));
  await waitFor(() => expect(screen.getByText('ready:42')).toBeTruthy());
  expect(calls).toBe(1);
});
