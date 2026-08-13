import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { usePlaceDetail } from '../usePlaceDetail';
import {
  PlaceSourceProvider,
  type SourceForPlace,
} from '../PlaceSourceContext';
import { LOCATION_PLACE } from '../../../core/places';
import type { Reading, ReadingDetail } from '../../../core/air';

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
  pm10: 30,
  no2: 22,
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
