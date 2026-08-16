import {
  renderHook,
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { usePlaceDetail } from '../usePlaceDetail';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../PlaceSourceContext';
import { LOCATION_PLACE } from '../../../core/places';
import type { Reading, ReadingDetail } from '../../../core/air';
import { RefreshProvider, useRefresh } from '../../refresh';

// Minimal real Reading (not `{} as any`) — getCurrentReading is unused by
// usePlaceDetail, but the stub source must still satisfy AirQualitySource.
const READING: Reading = {
  index: 5,
  pm25: 5,
  measuredAt: '2026-08-13 12:00:00',
  city: 'Kraków',
  station: 'x',
};

const detail: ReadingDetail = {
  history: [{ at: 't', pm25: 5, index: 5 }],
  pollutants: [
    { code: 'PM10', value: 30 },
    { code: 'NO2', value: 22 },
  ],
};

const wrap = (sfp: SourceForPlace) =>
  function W({ children }: { children: ReactNode }) {
    return (
      <PlaceSourceProvider sourceForPlace={sfp}>{children}</PlaceSourceProvider>
    );
  };

test('AC-7: getDetail present → detail resolves', async () => {
  const sfp: SourceForPlace = () => ({
    getCurrentReading: async () => READING,
    getDetail: async () => detail,
  });
  const { result } = await renderHook(() => usePlaceDetail(LOCATION_PLACE), {
    wrapper: wrap(sfp),
  });
  await waitFor(() => expect(result.current.detail).toEqual(detail));
});

test('AC-7: no getDetail → detail undefined (no throw)', async () => {
  const sfp: SourceForPlace = () => ({
    getCurrentReading: async () => READING,
  });
  const { result } = await renderHook(() => usePlaceDetail(LOCATION_PLACE), {
    wrapper: wrap(sfp),
  });
  // allow a tick; stays undefined
  await act(async () => {});
  expect(result.current.detail).toBeUndefined();
});

test('AC-7: rejected getDetail → detail undefined (no throw)', async () => {
  const sfp: SourceForPlace = () => ({
    getCurrentReading: async () => READING,
    getDetail: () => Promise.reject(new Error('x')),
  });
  const { result } = await renderHook(() => usePlaceDetail(LOCATION_PLACE), {
    wrapper: wrap(sfp),
  });
  await act(async () => {});
  expect(result.current.detail).toBeUndefined();
});

function RefreshDetailHarness() {
  const { refresh } = useRefresh();
  usePlaceDetail(LOCATION_PLACE);
  return (
    <Pressable testID="refresh-btn" onPress={refresh}>
      <Text>refresh</Text>
    </Pressable>
  );
}

test('AC-2: usePlaceDetail refetches when the signal bumps, not on an unrelated re-render', async () => {
  let calls = 0;
  const sfp: SourceForPlace = () => ({
    getCurrentReading: async () => READING,
    getDetail: async () => {
      calls += 1;
      return detail;
    },
  });

  await render(
    <RefreshProvider>
      <PlaceSourceProvider sourceForPlace={sfp}>
        <RefreshDetailHarness />
      </PlaceSourceProvider>
    </RefreshProvider>,
  );
  await waitFor(() => expect(calls).toBe(1));

  await fireEvent.press(screen.getByTestId('refresh-btn'));
  await waitFor(() => expect(calls).toBe(2));

  // The second press is debounced by RefreshProvider (signal unchanged) — no refetch.
  await fireEvent.press(screen.getByTestId('refresh-btn'));
  expect(calls).toBe(2);
});

test('AC-2: a same-place refresh keeps the current detail during the refetch (no flicker)', async () => {
  let call = 0;
  let resolveSecond: (d: ReadingDetail) => void = () => {};
  const sfp: SourceForPlace = () => ({
    getCurrentReading: async () => READING,
    getDetail: () => {
      call += 1;
      if (call === 1) return Promise.resolve(detail);
      return new Promise<ReadingDetail>(res => {
        resolveSecond = res;
      });
    },
  });
  const { result } = await renderHook(
    () => ({ d: usePlaceDetail(LOCATION_PLACE), r: useRefresh() }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RefreshProvider>
          <PlaceSourceProvider sourceForPlace={sfp}>
            {children}
          </PlaceSourceProvider>
        </RefreshProvider>
      ),
    },
  );
  await waitFor(() => expect(result.current.d.detail).toEqual(detail));

  // Same-place refresh: the second getDetail stays pending. Detail must NOT
  // blank to undefined mid-flight (the pre-fix bug flickered the chart/tiles).
  await act(async () => {
    result.current.r.refresh();
  });
  expect(result.current.d.detail).toEqual(detail);

  // Once the refetch resolves, the new value replaces the old.
  const detail2: ReadingDetail = {
    history: detail.history,
    pollutants: [{ code: 'PM10', value: 99 }],
  };
  await act(async () => {
    resolveSecond(detail2);
  });
  await waitFor(() => expect(result.current.d.detail).toEqual(detail2));
});

test('AC-2: unwrapped (no RefreshProvider) — usePlaceDetail still works, 1 call, no throw', async () => {
  let calls = 0;
  const sfp: SourceForPlace = () => ({
    getCurrentReading: async () => READING,
    getDetail: async () => {
      calls += 1;
      return detail;
    },
  });
  const { result } = await renderHook(() => usePlaceDetail(LOCATION_PLACE), {
    wrapper: wrap(sfp),
  });
  await waitFor(() => expect(result.current.detail).toEqual(detail));
  expect(calls).toBe(1);
});
