import { useEffect, useState } from 'react';
import type { Reading } from '../../core/air';
import type { ActivePlace } from '../../core/places';
import { useSourceForPlace } from './PlaceSourceContext';

export type ReadingState =
  | { status: 'loading'; reading?: Reading }
  | { status: 'ready'; reading: Reading }
  | { status: 'stale'; reading?: Reading };

// Fetches once when the place changes. On rejection → 'stale', keeping the last
// reading if any. Callers pass a STABLE place identity (LOCATION_PLACE, or a
// station object held in state/props) so the effect doesn't refire each render.
export function usePlaceReading(place: ActivePlace): ReadingState {
  const sourceForPlace = useSourceForPlace();
  const [state, setState] = useState<ReadingState>({ status: 'loading' });
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
  }, [sourceForPlace, place]);
  return state;
}
