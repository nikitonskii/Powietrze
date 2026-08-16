import { useEffect, useState } from 'react';
import type { Reading } from '../../core/air';
import type { ActivePlace } from '../../core/places';
import { useRefreshSignal } from '../refresh';
import { useSourceForPlace } from './PlaceSourceContext';

export type ReadingState =
  | { status: 'loading'; reading?: Reading }
  | { status: 'ready'; reading: Reading }
  | { status: 'stale'; reading?: Reading };

// Fetches once when the place's IDENTITY changes. On rejection → 'stale',
// keeping the last reading if any. The effect is keyed on `placeKey` (a
// primitive) rather than the `place` object, so a caller passing a fresh
// `{kind:'station',station}` literal every render (e.g. each favorites-list
// row) does NOT refire the fetch on unrelated re-renders.
export function usePlaceReading(place: ActivePlace): ReadingState {
  const sourceForPlace = useSourceForPlace();
  const signal = useRefreshSignal();
  const [state, setState] = useState<ReadingState>({ status: 'loading' });
  const placeKey =
    place.kind === 'location' ? 'location' : `station:${place.station.id}`;
  useEffect(() => {
    let active = true;
    sourceForPlace(place)
      .getCurrentReading()
      .then(r => active && setState({ status: 'ready', reading: r }))
      .catch(
        () =>
          active &&
          setState(prev => ({ status: 'stale', reading: prev.reading })),
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by placeKey; `place` identity intentionally excluded to avoid refetch churn
  }, [sourceForPlace, placeKey, signal]);
  return state;
}
