import { useEffect, useState } from 'react';
import type { ReadingDetail } from '../../core/air';
import type { ActivePlace } from '../../core/places';
import { useSourceForPlace } from './PlaceSourceContext';

// Fetches rich detail (24h history + PM10/NO2) for the ACTIVE place only, once
// per place identity. Mirrors usePlaceReading. Absent getDetail or a rejection
// → detail stays undefined (Teraz degrades to Hero-only).
export function usePlaceDetail(place: ActivePlace): { detail?: ReadingDetail } {
  const sourceForPlace = useSourceForPlace();
  const [detail, setDetail] = useState<ReadingDetail | undefined>(undefined);
  const placeKey =
    place.kind === 'location' ? 'location' : `station:${place.station.id}`;
  useEffect(() => {
    let active = true;
    setDetail(undefined); // reset while the new place's detail loads
    sourceForPlace(place)
      .getDetail?.()
      .then(d => active && setDetail(d))
      .catch(() => active && setDetail(undefined));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by placeKey; `place` identity intentionally excluded to avoid refetch churn
  }, [sourceForPlace, placeKey]);
  return { detail };
}
