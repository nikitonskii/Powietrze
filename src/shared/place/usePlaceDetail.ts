import { useEffect, useRef, useState } from 'react';
import type { ReadingDetail } from '../../core/air';
import type { ActivePlace } from '../../core/places';
import { useRefreshSignal } from '../refresh';
import { useSourceForPlace } from './PlaceSourceContext';

// Fetches rich detail (24h history + PM10/NO2) for the ACTIVE place only, once
// per place identity, and refetches on a refresh signal. Absent getDetail or a
// rejection → detail stays undefined (Teraz degrades to Hero-only).
export function usePlaceDetail(place: ActivePlace): { detail?: ReadingDetail } {
  const sourceForPlace = useSourceForPlace();
  const signal = useRefreshSignal();
  const [detail, setDetail] = useState<ReadingDetail | undefined>(undefined);
  const placeKey =
    place.kind === 'location' ? 'location' : `station:${place.station.id}`;
  const prevKey = useRef(placeKey);
  useEffect(() => {
    let active = true;
    if (prevKey.current !== placeKey) {
      prevKey.current = placeKey;
      setDetail(undefined); // new place → clear stale detail while it loads
    }
    // A same-place signal-triggered refetch keeps the current detail until the
    // new value resolves (no flicker of the chart/tiles during pull-to-refresh).
    sourceForPlace(place)
      .getDetail?.()
      .then(d => active && setDetail(d))
      .catch(() => active && setDetail(undefined));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by placeKey; `place` identity intentionally excluded to avoid refetch churn
  }, [sourceForPlace, placeKey, signal]);
  return { detail };
}
